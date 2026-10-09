"use client"

import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { useFrame } from "@react-three/fiber"

// 月面 (アポロ 8 の地球の出)。画面全体を 1 枚のシェーダーで描く。
// 地形の高さは起動時に CPU で焼いて DataTexture にする。毎フレームの fbm 評価を避け、iGPU の予算に収めるため。

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  // 頂点は NDC をそのまま出す。カメラ行列を通さず全画面を覆う
  vUv = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const FRAGMENT = /* glsl */ `
precision highp float;

// 時刻は vec で渡す。float 単独の uniform が更新されない環境があったため
uniform vec2 uClock;
// x: 画面の縦横比, yz: 地球の中心 (NDC), w: 地球の半径 (NDC の y 基準)。float 単独より確実に届くので束ねる
uniform vec4 uScreen;
uniform vec2 uLook;
uniform vec3 uSun;
uniform sampler2D uHeight;

varying vec2 vUv;

const float TAN = 0.5;          // 半画角の正接。地平線は画面下 1/3 に来る
const float DOMAIN = 128.0;     // 地形テクスチャが覆うワールド幅
const float CAM_H = 1.6;        // 視点の高さ (地表からの目の高さ)
const vec3 SUN_COL = vec3(3.8, 3.5, 3.1);
const vec3 EARTHSHINE = vec3(0.42, 0.56, 0.78);
const float STAR_P = 0.0045;     // 星のセルに星が入る確率。疎らにするため低く保つ
const float EXPOSURE = 0.85;

float hash12(vec2 p) {
  // sin を使わない hash。大きな座標でも精度が崩れにくい
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
    mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// 地表の細かい粒状感 (レゴリスの凹凸)。法線にだけ効かせ、歩幅計算には使わない
float micro(vec2 p) {
  // 高周波 (p*23) は遠くでエイリアシングし砂嵐のような粒になるため外した
  return vnoise(p * 6.0) * 0.8 + vnoise(p * 15.0) * 0.2;
}

float gh(vec2 xz) {
  // 遠方の起伏は、レイが当たるかどうかで地平線が 1 px 単位で出たり消えたりし鋸歯になる。
  // 距離とともに平らに畳み、地平線を柔らかく溶かす
  return texture2D(uHeight, xz / DOMAIN).r * (1.0 - smoothstep(30.0, 150.0, length(xz)));
}

vec3 groundNormal(vec2 xz, float dist) {
  // 遠くは差分の間隔を広げ、テクセルより細かい勾配を拾わないようにする
  // 1 テクセル (0.25) に近い間隔で差分を取り、クレーター縁の段々状の法線を消す
  float e = 0.14 * (1.0 + dist * 0.02);
  float dx = (gh(xz + vec2(e, 0.0)) - gh(xz - vec2(e, 0.0))) / (2.0 * e);
  float dz = (gh(xz + vec2(0.0, e)) - gh(xz - vec2(0.0, e))) / (2.0 * e);
  vec3 n = vec3(-dx, 1.0, -dz);
  // 粒感は近景だけ。遠くは 1 px より細かくなりノイズとして見えるため、fade が 0 の画素では評価を省く
  float fade = 1.0 - smoothstep(3.0, 30.0, dist);
  if (fade > 0.0) {
    float me = 0.03;
    float mx = (micro(xz + vec2(me, 0.0)) - micro(xz - vec2(me, 0.0))) / (2.0 * me);
    float mz = (micro(xz + vec2(0.0, me)) - micro(xz - vec2(0.0, me))) / (2.0 * me);
    n += vec3(-mx, 0.0, -mz) * 0.0025 * fade;
  }
  return normalize(n);
}

// 地形を高さ場として辿る。見つからなければ -1
float marchGround(vec3 ro, vec3 rd) {
  float t = 0.0;
  float prevT = 0.0;
  for (int i = 0; i < 48; i++) {
    vec3 p = ro + rd * t;
    // 半径 150 の外は高さが 0 になり平面と同じ。呼び出し側は平面の交点を使うので、ここで打ち切って歩数を減らす
    if (length(p.xz) > 150.0) break;
    float d = p.y - gh(p.xz);
    if (d < 0.0) {
      // 交点を二分法で詰める。斜めの視線で段が出ないように
      float a = prevT;
      float b = t;
      for (int j = 0; j < 5; j++) {
        float m = 0.5 * (a + b);
        vec3 q = ro + rd * m;
        if (q.y - gh(q.xz) < 0.0) { b = m; } else { a = m; }
      }
      return 0.5 * (a + b);
    }
    prevT = t;
    // 平面なら d / (-rd.y) で一気に地表に届く。起伏に備えて 0.6 倍で進む
    t += clamp(d / (-rd.y + 0.04) * 0.6, 0.02, 6.0);
    if (t > 400.0) break;
  }
  return -1.0;
}

// 太陽方向へ辿って影の有無を見る。距離に比例した penumbra で影の縁を少しだけ柔らかくする
float shadowTerm(vec3 p, vec3 n, vec3 L) {
  float res = 1.0;
  float t = 0.12;
  vec3 o = p + n * 0.02;
  // 歩幅を細かくして影の縁の階段状のギザつきを抑える。ステップ数は地表ピクセルだけに効く
  for (int i = 0; i < 36; i++) {
    vec3 q = o + L * t;
    float d = q.y - gh(q.xz);
    if (d < 0.0) return 0.0;
    // 係数を上げると縁が硬くなり、下げると太陽の低い角で影が広がって溶ける。中間に置く
    res = min(res, 14.0 * d / t);
    t += max(0.04, t * 0.09);
  }
  return clamp(res, 0.0, 1.0);
}

float h3(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)) * 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float n3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(h3(i), h3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 0.0)), h3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(h3(i + vec3(0.0, 0.0, 1.0)), h3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 1.0)), h3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z
  );
}

float fbm3(vec3 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * n3(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return s / 0.9375;
}

vec3 rotY(vec3 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

// 地球の面。大陸・雲・大気の縁の光まで一度に作る。V は地球の中心から見た視線 (手前向き)
vec3 earthColor(vec3 n, vec3 V) {
  vec3 q = rotY(n, uClock.x * 0.012);
  // 大陸は全体の 2〜3 割に抑える。陸が多いと玩具のように見えるため
  float land = fbm3(q * 2.0 + 3.1);
  float continent = smoothstep(0.56, 0.6, land);

  // 海は深い藍が支配的。陸はオーカーと乾いた茶で彩度を落とす
  // 陸と海は片方しか効かない画素が大半。使わない側の fbm は評価しない (混ぜ方は従来と同じ)
  vec3 surf = vec3(0.0);
  if (continent < 1.0) surf = mix(vec3(0.002, 0.012, 0.06), vec3(0.006, 0.036, 0.13), smoothstep(0.35, 0.7, fbm3(q * 4.0)));
  if (continent > 0.0) {
    vec3 terrain = mix(vec3(0.09, 0.08, 0.05), vec3(0.2, 0.15, 0.09), smoothstep(0.42, 0.7, fbm3(q * 5.0 + 7.0)));
    surf = mix(surf, terrain, continent);
  }

  // 雲は 2 段の歪みで低気圧の渦にする。細い筋は別の細かいノイズで重ねる。
  // 塊 (ブロブ) にすると玩具のように見えるので、渦と筋を優先する
  vec3 cq = rotY(n, uClock.x * 0.02);
  vec3 wq = cq * 2.4 + vec3(uClock.x * 0.01, 0.0, 0.0);
  vec3 warp = vec3(fbm3(wq + 1.3), fbm3(wq + 5.2), fbm3(wq + 9.1));
  float cl = fbm3(cq * 3.2 + warp * 1.8);
  float blob = smoothstep(0.5, 0.72, cl) * 0.92;
  // 細い筋は fbm の零交差 (1 - |2f-1| が尾根になる) で作る。尾根だけ残すと糸状の雲になる
  // 細い筋は cl が 0.44 を超える所にしか出ない (smoothstep の下端)。その外は fbm を省く
  float streak = 0.0;
  if (cl > 0.44) {
    float fil = 1.0 - abs(2.0 * fbm3(cq * 8.0 + warp * 2.2) - 1.0);
    streak = smoothstep(0.86, 0.99, fil) * smoothstep(0.44, 0.6, cl) * 0.85;
  }
  float cover = max(blob, streak);
  surf = mix(surf, vec3(0.88, 0.9, 0.92), cover);

  // terminator は太陽の向きでそのまま決まる。ギバスの明部が画面右手に来る
  float ndl = dot(n, uSun);
  // 境界はなだらかに。硬いと地球が球でなく切り抜きに見える
  float diff = smoothstep(-0.15, 0.45, ndl);
  // 夜側は地表の模様を出さない。模様を残すと、ガンマで持ち上がって暗い地球が見えてしまう
  vec3 lit = surf * 1.2 * diff;
  // 日照の雲は画面で最も明るい白にする。海より十分上に置き、トーンカーブの肩で滑らかに収める
  lit += vec3(0.9, 0.92, 0.95) * cover * 0.9 * diff;
  lit += vec3(0.0003, 0.0006, 0.0012) * (1.0 - diff);

  // 海のグリント。雲と陸では出さない
  vec3 H = normalize(uSun + V);
  float spec = pow(max(dot(n, H), 0.0), 90.0) * 0.5 * (1.0 - continent) * (1.0 - cover);
  lit += vec3(1.0, 0.97, 0.9) * spec * diff;

  // 縁の大気。細い青を残すため、指数を高くして面の縁だけに効かせる
  float rim = pow(1.0 - max(dot(n, V), 0.0), 6.0);
  lit += vec3(0.3, 0.6, 1.0) * rim * 0.5 * (0.1 + diff);
  return lit;
}

// 星。視線の接平面 (tp) に 2D セルを置く。遠い空の奥行きは不要なので安くなる
vec3 stars(vec2 tp, float sp) {
  vec3 acc = vec3(0.0);
  const float S = 0.012;
  vec2 gi = floor(tp / S);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 c = gi + vec2(float(i), float(j));
      float h = hash12(c);
      if (h > sp) continue;
      vec2 pos = (c + vec2(hash12(c + 17.3), hash12(c + 41.7))) * S;
      float d = length(tp - pos);
      float mag = hash12(c + 93.1);
      float sigma = 0.00085 + 0.0006 * mag;
      float core = exp(-d * d / (2.0 * sigma * sigma));
      vec3 temp = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.85, 0.65), hash12(c + 5.5));
      acc += temp * core * (0.02 + 0.45 * pow(mag, 5.0));
    }
  }
  return acc;
}

// 新しいクレーターから放射状に出る白い筋 (エジェクタ・レイ)。角度を細かく切って筋にし、遠ざかるほど薄れる。
// 地形の高さには入れず、アルベドだけに足す。影の計算を増やさないため
float ejecta(vec2 p, vec2 c, float r, float seed) {
  vec2 d = p - c;
  float dist = length(d) / r;
  if (dist > 7.0 || dist < 1.0) return 0.0;
  float ang = atan(d.y, d.x);
  // 境界を揺らして筋の幅を不均一にする。等間隔の櫛に見えないように
  float bin = floor(ang * 26.0 + 1.2 * vnoise(vec2(ang * 4.0, seed)));
  float s = hash12(vec2(bin, seed));
  // 筋ごとに長さを変え、途中で途切れさせる
  float len = 0.3 + 0.7 * hash12(vec2(bin, seed + 7.0));
  float reach = exp(-(dist - 1.0) * 0.9 / len);
  float broke = smoothstep(0.35, 0.7, vnoise(vec2(dist * 2.5, bin)));
  return s * s * reach * broke;
}

// 1 つの山塊。ローレンツ型なので頂は丸く、裾は長く引く。
// 左の裾は長く、右は短く立ち上がらせ、山ごとに非対称な形にする
float massif(float u, float c, float w, float h) {
  float ww = u < c ? w * 1.3 : w * 0.8;
  float x = (u - c) / ww;
  return h / (1.0 + x * x);
}

// 遠景の稜線の高さ (画面高さ = 1 の tan 単位)。画面の横位置 u (-1〜1) で与える。
// 山の間隔と高さを不揃いにし、等間隔の櫛に見えないようにする
// ks は縦横比に応じた高さの倍率。縦長の画面では横幅に対して山が薄く潰れるため、高さだけを持ち上げる
float farRidge(float u, float ks) {
  // 微小な揺らぎは sin で与える。value noise の格子は微分が途切れ、斜面の明暗が縦の筋になるため使わない
  float s = 0.002 + 0.0012 * sin(u * 5.1 + 0.7) + 0.0008 * sin(u * 9.7 + 2.1);
  s += massif(u, -0.8, 0.26, 0.03);
  s += massif(u, -0.36, 0.22, 0.05);
  s += massif(u, 0.12, 0.15, 0.022);
  s += massif(u, 0.55, 0.27, 0.044);
  s += massif(u, 1.0, 0.18, 0.026);
  s += massif(u, 0.8, 0.12, 0.012);
  return max(s, 0.0) * ks;
}

// 遠方の平野色。地表の遠景と地平線直上の空が同じ値を使い、地平線に段差を出さない
vec3 plainColor() {
  return 0.11 * (SUN_COL * max(uSun.y, 0.0) + EARTHSHINE * 0.03);
}

void main() {
  // シフトレンズ風の投影。視線の y を持ち上げて地平線を画面下 1/3 に置く
  vec2 look = uLook;
  vec3 raw = vec3(vUv.x * uScreen.x * TAN + look.x * 0.004, vUv.y * TAN + TAN / 3.0 + look.y * 0.004, -1.0);
  vec3 rd = normalize(raw);

  // 地球はパララックスを少し強めて奥行きを出す
  // 地球は無限遠なので星と同じ量だけ動かす。別の係数で動かすと、地球だけ星空の中を滑って見える
  vec2 eN = uScreen.yz;
  vec3 ed = normalize(vec3(eN.x * uScreen.x * TAN, eN.y * TAN + TAN / 3.0, -1.0));

  // 地球は月から遠いので平行投影の球とみなし、画面上の円として描く。
  // 画角の端で角度判定すると透視投影の伸びで楕円になるため、2D の距離で判定する
  float rT = uScreen.w * TAN;
  vec2 q = vec2(vUv.x * uScreen.x * TAN + look.x * 0.004, vUv.y * TAN + TAN / 3.0 + look.y * 0.004)
         - vec2(eN.x * uScreen.x * TAN, eN.y * TAN + TAN / 3.0);
  float dd = length(q) / rT;

  // 球の基底。手前向き (Bz) を中心に、右 (Bx) と上 (By) を張る
  vec3 Bz = -ed;
  vec3 Bx = normalize(cross(vec3(0.0, 1.0, 0.0), Bz));
  vec3 By = cross(Bz, Bx);

  vec3 col = vec3(0.0);
  if (rd.y < 0.0) {
    // 地表だけ視点を横にずらす。近い地面ほど大きく動き、無限遠の空・星・地球・山塊は回転分だけ動く (視差)
    vec3 ro = vec3(look.x * 0.04, CAM_H, 0.0);
    float tg = marchGround(ro, rd);
    if (tg < 0.0) tg = -ro.y / rd.y; // 遠方は平面として扱い、地平線まで地面を届かせる
    // 遠方は地形の起伏が畳まれ平野色に収束する。w が 1 の画素は法線も影も使わないので計算を省く
    float w = smoothstep(25.0, 150.0, tg);
    col = plainColor();
    if (w < 1.0) {
      vec3 p = ro + rd * tg;
      vec3 n = groundNormal(p.xz, tg);
      float alb = texture2D(uHeight, p.xz / DOMAIN).g;
      // 地表アルベドの細かいむらは近景だけ。遠くは係数が 0 なので評価しない
      float fineFade = 1.0 - smoothstep(4.0, 25.0, tg);
      if (fineFade > 0.0) alb *= 1.0 + (vnoise(p.xz * 9.0) - 0.5) * 0.12 * fineFade;
      // 中景の新しいクレーターの白い筋。暗い地表に対してだけ際立つ
      alb += 0.06 * (ejecta(p.xz, vec2(5.5, -13.0), 1.6, 3.0) + ejecta(p.xz, vec2(-9.0, -30.0), 2.2, 11.0));
      // 太陽に背を向けた面は直射が 0 なので、影の計算を省く
      float ndl = max(dot(n, uSun), 0.0);
      float sh = ndl > 0.0 ? shadowTerm(p, n, uSun) : 0.0;
      vec3 direct = SUN_COL * ndl * sh;
      // 大気がないので影は真っ黒。地球照だけが影をうっすら青く持ち上げる。下限を上げすぎると夜の月面が霞むので控えめに
      vec3 ambient = EARTHSHINE * (0.035 + 0.06 * max(dot(n, ed), 0.0));
      col = mix(alb * (direct + ambient), plainColor(), w);
    }
    // 水平線の少し下は、文字パネルの下部が重なる帯。日向の縁の白を少しだけ下げて本文の背景を落ち着かせる。
    // 水平線ぴったりは減らさない。そこを暗くすると空側の霞との間に段差が出るため、0 から立ち上げる
    float textBand = smoothstep(0.0, 0.03, -raw.y) * (1.0 - smoothstep(0.12, 0.3, -raw.y));
    col *= 1.0 - 0.22 * textBand;
    // 画面の下端ほど地表を沈める。下端の明るい近景がパネルの下部と競い、文字の背景が浮くため
    col *= 1.0 - 0.3 * smoothstep(-0.12, -0.333, raw.y);
  } else {
    vec3 plainCol = plainColor();
    // 縦長ほど 0 に近づく滑らかな係数。横長の画面では 0 になり、デスクトップの見た目は変えない
    float portrait = 1.0 - smoothstep(0.7, 1.1, uScreen.x);
    float haze = 1.0 - smoothstep(0.0, 0.012, raw.y);
    // 縦長は見える空の面積が小さいので、星の出現率を少し上げて星の数を保つ
    col = mix(stars(raw.xy, STAR_P * mix(1.0, 1.4, portrait)), plainCol, haze);
    // 遠景の山塊。高さは画面の高さ基準 (tan 単位) なので縦横比に依らない
    float u = raw.x / (uScreen.x * TAN);
    // 縦長では山の幅に対して高さが足りず細い線に潰れるため、高さの倍率を縦横比で持ち上げる
    float ks = mix(1.0, 1.45, portrait);
    // 山の頂の和は約 0.19 (ks 倍)。その上の画素は山の式を評価しなくても結果が変わらないので省く
    if (raw.y <= 0.19 * ks + 0.002) {
      float dsil = farRidge(u, ks) - raw.y;
      // 1 px ほどの幅で縁を柔らかく切る。硬いと切り抜きに見える
      float inside = smoothstep(-0.0012, 0.0012, dsil);
      // 斜面の向きで明暗を決める。右下がりの面は太陽 (右) を向くので明るく、左の裾は影になる
      // 差分は広めの間隔で取る。狭いと小さな起伏ごとに明暗が縦の筋になるため、大きな斜面だけを拾う
      float e = 0.06;
      float slope = (farRidge(u + e, ks) - farRidge(u - e, ks)) / (2.0 * e * ks);
      float lit = smoothstep(0.0, 1.0, clamp(0.5 - slope * 3.0, 0.0, 1.0));
      // 太陽は右の低い位置なので、山並み全体も右から左へ暗くなる。なだらかな関数にして縦の筋を作らない
      float sunGrad = mix(0.45, 1.0, smoothstep(-0.9, 0.7, u));
      // 岩肌の大きな明暗むら。低コントラストにし、プラスチックの一様な面に見せない
      float mott = vnoise(vec2(u * 5.0, raw.y * 9.0 + 1.0)) * 0.6 + vnoise(vec2(u * 13.0, raw.y * 22.0)) * 0.4;
      // 稜線からの距離で等高線状の帯を薄く入れる。位相を横方向にゆらし、等間隔の縞にしない
      float ridgeDist = max(dsil, 0.0);
      float terr = sin(ridgeDist * 125.0 + 4.0 * vnoise(vec2(u * 3.0, 2.0)));
      vec3 body = mix(vec3(0.008, 0.008, 0.01), vec3(0.075, 0.072, 0.068), lit) * sunGrad;
      body *= (0.84 + 0.32 * mott) * (1.0 + 0.09 * terr);
      // 稜線の頂だけ太陽側が少し光る。頂の縁は広めにぼかし、肩を柔らかく見せる
      float crest = exp(-ridgeDist / 0.003) * smoothstep(-0.2, 0.8, u);
      body += vec3(0.03) * crest;
      // 山の根元は平野へ溶かし、地平線の段差を消す。
      // 溶かす帯は地平線から 0.035 まで取る。狭いと根元に水平の線が残り、山が板のように見えるため
      body = mix(body, plainCol, 1.0 - smoothstep(0.0, 0.035, raw.y));
      col = mix(col, body, inside);
    }
  }

  if (dd < 1.0) {
    // 円の中の位置から球面の法線を出す
    float zc = sqrt(max(1.0 - dd * dd, 0.0));
    vec2 qn = q / rT;
    vec3 en = normalize(qn.x * Bx + qn.y * By + zc * Bz);
    col = earthColor(en, Bz);
  } else if (rd.y >= 0.0) {
    // 地球の縁の大気光。太陽側の縁だけ細く光らせる。
    // 太陽方向を縁の接平面へ投影し、角度の cos で減衰させる。
    // 以前は視線の内積の符号で切っていたため、中心を通る直線で夜側と昼側が切れていた
    float off = (dd - 1.0) * rT;
    float g = exp(-off * 420.0) + 0.25 * exp(-off * 90.0);
    vec2 sun2 = vec2(dot(uSun, Bx), dot(uSun, By));
    float cs = dot(normalize(q), normalize(sun2));
    float lim = pow(max(cs, 0.0), 3.0);
    col += vec3(0.3, 0.6, 1.0) * g * lim * 0.6;
  }

  // 色相を保つ輝度ベースのトーンカーブ。チャンネルごとに掛けると、太陽色の白が黄色く飽和するため。
  // 輝度を 1 - exp(-L) で丸め、その比率を RGB に掛ける
  vec3 c = max(col, 0.0) * EXPOSURE;
  float L = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 mapped = c * ((1.0 - exp(-L)) / max(L, 1e-5));
  // 最大成分の肩を 0.8 から滑らかに 1 へ寄せ、色相を保ったまま縮める。白に切ると日向の縁が平らな板になるため
  float m = max(max(mapped.r, mapped.g), mapped.b);
  float fm = m < 0.8 ? m : 0.8 + 0.2 * (1.0 - exp(-(m - 0.8) / 0.2));
  mapped *= fm / max(m, 1e-5);
  col = pow(mapped, vec3(1.0 / 2.2));
  // 階調の段差を消すディザ。ガンマの後に 1 LSB 幅で足す。前に足すと暗部で数 LSB の砂嵐になる
  col += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`

const DOMAIN = 128
const N = 512
const TEXEL = DOMAIN / N

// 再現性のある乱数。Math.random を render で使わないための seed 付き PRNG
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 周期つき value noise。タイル境界が見えないように格子を剰余で回す
function periodicNoise(lat: Float32Array, cells: number, x: number, y: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const ix0 = ((x0 % cells) + cells) % cells
  const ix1 = (ix0 + 1) % cells
  const iy0 = ((y0 % cells) + cells) % cells
  const iy1 = (iy0 + 1) % cells
  // 添字は剰余で範囲内に収めてあるので、?? 0 は型のためだけ
  const a = lat[iy0 * cells + ix0] ?? 0
  const b = lat[iy0 * cells + ix1] ?? 0
  const c = lat[iy1 * cells + ix0] ?? 0
  const d = lat[iy1 * cells + ix1] ?? 0
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}

// 型付き配列の k 番目に v を足す。noUncheckedIndexedAccess では arr[k] += v と書けないため
function addAt(arr: Float32Array, k: number, v: number) {
  arr[k] = (arr[k] ?? 0) + v
}

// 大きなうねり (周波数ごとの振幅) を高さに足す
function addRelief(h: Float32Array, rnd: () => number) {
  const octaves: [number, number][] = [
    [4, 0.9],
    [8, 0.45],
    [16, 0.2],
    [32, 0.09],
    [64, 0.04],
  ]
  for (const [cells, amp] of octaves) {
    const lat = new Float32Array(cells * cells)
    for (let i = 0; i < lat.length; i++) lat[i] = rnd() * 2 - 1
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const v = periodicNoise(lat, cells, ((i + 0.5) / N) * cells, ((j + 0.5) / N) * cells)
        addAt(h, j * N + i, amp * v)
      }
    }
  }
}

// 高地と海 (マリア) の明るさ差をアルベドに描く
function paintMaria(alb: Float32Array, rnd: () => number) {
  const latA = new Float32Array(9)
  const latB = new Float32Array(36)
  for (let i = 0; i < latA.length; i++) latA[i] = rnd() * 2 - 1
  for (let i = 0; i < latB.length; i++) latB[i] = rnd() * 2 - 1
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = ((i + 0.5) / N) * 3
      const y = ((j + 0.5) / N) * 3
      const m = periodicNoise(latA, 3, x, y) * 0.6 + periodicNoise(latB, 6, x * 2, y * 2) * 0.4
      const t = Math.min(1, Math.max(0, (m + 0.25) / 0.45))
      // 月の地表は暗い玄武岩が基調。明るすぎるとレゴリスが前景で白い板になり、文字域の可読性を落とす
      alb[j * N + i] = 0.03 + (0.075 - 0.03) * t * t * (3 - 2 * t)
    }
  }
}

// クレーターを 1 つ押す。縁は盛り上がり、床は少し暗くする
function stampCrater(h: Float32Array, alb: Float32Array, cx: number, cy: number, r: number, depthK: number, rimK = 0.07) {
  const reach = Math.ceil((r * 1.3) / TEXEL)
  const ci = Math.floor(cx / TEXEL)
  const cj = Math.floor(cy / TEXEL)
  for (let dj = -reach; dj <= reach; dj++) {
    for (let di = -reach; di <= reach; di++) {
      const i = (((ci + di) % N) + N) % N
      const j = (((cj + dj) % N) + N) % N
      let dx = (i + 0.5) * TEXEL - cx
      let dy = (j + 0.5) * TEXEL - cy
      dx -= DOMAIN * Math.round(dx / DOMAIN)
      dy -= DOMAIN * Math.round(dy / DOMAIN)
      const d = Math.hypot(dx, dy) / r
      if (d > 1.3) continue
      const k = j * N + i
      if (d < 1) {
        addAt(h, k, -depthK * r * (1 - d * d))
        addAt(alb, k, -0.015 * (1 - d * d))
      }
      const rim = Math.exp(-(((d - 1) / 0.14) ** 2))
      addAt(h, k, rimK * r * rim)
      addAt(alb, k, 0.02 * rim)
    }
  }
}

// クレーターを大・中・小の 3 段と、中景の見せ場の 2 つ押す
function addCraters(h: Float32Array, alb: Float32Array, rnd: () => number) {
  // 深さは直径の比率で決める。浅すぎると影が出ず月の凹凸が平らに見える
  const craterSets: [number, number, number, number][] = [
    [70, 2.0, 7.0, 0.32],
    [450, 0.7, 2.0, 0.28],
    [2600, 0.18, 0.7, 0.22],
  ]
  for (const [count, rMin, rMax, depthK] of craterSets) {
    for (let c = 0; c < count; c++) {
      const cx = rnd() * DOMAIN
      const cy = rnd() * DOMAIN
      const r = rMin + (rMax - rMin) * rnd() * rnd()
      stampCrater(h, alb, cx, cy, r, depthK)
    }
  }
  // 中景の見せ場。縁を高くし、平らな床に輪郭を出す。座標はワールド xz (負は剰余で正に回す)
  const heroes: [number, number, number, number][] = [
    [-3, -9, 1.8, 0.36],
    [4.2, -15.5, 2.8, 0.34],
  ]
  for (const [x, z, r, depthK] of heroes) {
    stampCrater(h, alb, ((x % DOMAIN) + DOMAIN) % DOMAIN, ((z % DOMAIN) + DOMAIN) % DOMAIN, r, depthK, 0.16)
  }
}

// 高さとアルベドを 1 枚のテクスチャに詰める
function packTerrain(h: Float32Array, alb: Float32Array): THREE.DataTexture {
  // HalfFloat で詰める。線形補間が効き、かつ 8bit より段差が出にくい
  const data = new Uint16Array(N * N * 4)
  for (let k = 0; k < N * N; k++) {
    data[k * 4] = THREE.DataUtils.toHalfFloat(h[k] ?? 0)
    data[k * 4 + 1] = THREE.DataUtils.toHalfFloat(alb[k] ?? 0)
    data[k * 4 + 2] = THREE.DataUtils.toHalfFloat(0)
    data[k * 4 + 3] = THREE.DataUtils.toHalfFloat(1)
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.HalfFloatType)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

// 地形を CPU で一度だけ焼く。高さは R、アルベドは G。乱数を引く順番で地形が決まるので、呼ぶ順は変えない
function buildTerrain(): THREE.DataTexture {
  const rnd = mulberry32(1969)
  const h = new Float32Array(N * N)
  const alb = new Float32Array(N * N)
  addRelief(h, rnd)
  paintMaria(alb, rnd)
  addCraters(h, alb, rnd)
  return packTerrain(h, alb)
}

// 地球の中心 (NDC)。画面右上に置き、中央の文字域にはかからないようにする
const EARTH_DESKTOP = new THREE.Vector2(0.5, 0.42)
const EARTH_PORTRAIT = new THREE.Vector2(0.3, 0.5)
// 地球の半径 (NDC の y 基準)。以前より少し小さくし、月面の主役を地表に寄せる
const EARTH_R_DESKTOP = 0.3
const EARTH_R_PORTRAIT = 0.21
// 太陽は右手の低い位置 (約 6.5 度)。3 度だと床が黒一色になり、クレーター縁の影の境界が消えて黒い塊に見えた。
// 少し上げて床に光の勾配を残す。わずかに手前へ寄せるのは、地球を凸月 (ギバス) に見せるため。同じ太陽が両方を照らす
const SUN_DIR = new THREE.Vector3(0.93, 0.11, 0.25).normalize()

// 材質の uniforms の型。THREE.IUniform の既定値は any なので、使う値の型を明示する
type LunarUniforms = {
  uClock: THREE.IUniform<THREE.Vector2>
  uScreen: THREE.IUniform<THREE.Vector4>
  uLook: THREE.IUniform<THREE.Vector2>
  uSun: THREE.IUniform<THREE.Vector3>
  uHeight: THREE.IUniform<THREE.DataTexture>
}

export function LunarSurfaceTheme() {
  // 地形は起動時に一度だけ焼く。再レンダーのたびに焼き直すと CPU を無駄にする
  const height = useMemo(() => buildTerrain(), [])
  // GPU 側の実体はアンマウント時に解放する。JS 側のテクスチャは残るので、再マウントでも再アップロードされる
  useEffect(() => () => height.dispose(), [height])

  const uniforms = useMemo<LunarUniforms>(
    () => ({
      uClock: { value: new THREE.Vector2() },
      uScreen: { value: new THREE.Vector4(16 / 9, EARTH_DESKTOP.x, EARTH_DESKTOP.y, EARTH_R_DESKTOP) },
      uLook: { value: new THREE.Vector2() },
      uSun: { value: SUN_DIR.clone() },
      uHeight: { value: height },
    }),
    [height],
  )

  const matRef = useRef<THREE.ShaderMaterial>(null)

  useFrame((state, delta) => {
    const mat = matRef.current
    if (!mat) return
    // 材質が実際に持つ uniforms へ書く。memo の値を直接書き換えると届かないことがあるため
    const u = mat.uniforms as LunarUniforms
    const portrait = state.size.width < state.size.height
    const earth = portrait ? EARTH_PORTRAIT : EARTH_DESKTOP
    u.uClock.value.x = state.clock.elapsedTime
    // 縦横比は毎フレーム取り直す。リサイズや端末の回転で投影が潰れないようにするため
    u.uScreen.value.set(state.size.width / state.size.height, earth.x, earth.y, portrait ? EARTH_R_PORTRAIT : EARTH_R_DESKTOP)
    // 視点はごくわずかに寄せる。落ち着いた動きにするため遅く追う
    u.uLook.value.lerp(state.pointer, 1 - Math.exp(-delta * 1.2))
  })

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <mesh frustumCulled={false} renderOrder={-1}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={VERTEX}
          fragmentShader={FRAGMENT}
          uniforms={uniforms}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}
