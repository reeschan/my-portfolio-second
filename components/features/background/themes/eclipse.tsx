"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

// 全画面の平面をクリップ空間へ直接置く。カメラ行列を通さないので、
// 画面の縦横比や FOV に関係なく必ず画面全体を覆える
const vertexShader = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

// 皆既日食の全体像: 黒い月円盤 + 真珠色のコロナ + 赤いプロミネンス + 深い紺色の空
// 計算はすべて 1 枚のフラグメントシェーダーで行う。見えない項は分岐で飛ばし、描画負荷を抑える
const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec2 uResolution;
uniform float uAspect;
uniform vec2 uShift;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// 星: セルごとに高々 1 つ置き、近傍 3x3 だけを見る。明るい星ほど少なく、大きい
// pxU は 1 ピクセルの長さ。星の大きさをピクセル単位で決め、小さすぎて角ばるのを防ぐ
vec3 stars(vec2 q, float cell, float density, float pxU) {
  vec2 g = floor(q / cell);
  vec3 acc = vec3(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = g + vec2(float(i), float(j));
      float h = hash12(id);
      if (h > density) continue;
      vec2 pos = (id + vec2(hash12(id + 1.7), hash12(id + 4.2))) * cell;
      float mag = hash12(id + 9.1);
      float b = pow(mag, 5.0) + 0.05;
      // 最小でも約 1px の広がりを持たせる。これより絞ると丸い点が正方形のドットに見える
      float s = pxU * (0.55 + 0.5 * pow(mag, 4.0));
      float dd = length(q - pos);
      float tw = 0.88 + 0.12 * sin(uTime * (0.6 + 1.4 * h) + h * 60.0);
      // 色温度を三段に分ける。大半は青白く、少数が白、ごく一部が暖色のオレンジ
      float tt = hash12(id + 13.3);
      vec3 tint = tt < 0.6 ? vec3(0.72, 0.82, 1.0)
                : tt < 0.9 ? vec3(1.0, 0.96, 0.9)
                : vec3(1.0, 0.8, 0.62);
      // にじみは 3 倍の幅のガウスで弱く足す。指数減衰だと 3x3 の外で切れ、セルの角が四角く見える
      float core = exp(-dd * dd / (2.0 * s * s));
      // 明るい上位数個だけ小さな光輪を足す。全部に足すと星がぼやけた円盤に見える
      float glow = mag > 0.93 ? 0.12 * exp(-dd * dd / (2.0 * 5.0 * s * s)) : 0.0;
      acc += tint * b * tw * (core + glow);
    }
  }
  return acc;
}

// 惑星: 星より少し大きく、またたかせない。大気のにじみを表す弱い裾を足す
vec3 planet(vec2 q, vec2 pos, float s, vec3 tint, float bright) {
  float dd = length(q - pos);
  float core = exp(-dd * dd / (2.0 * s * s));
  float halo = exp(-dd / (s * 6.0)) * 0.05;
  return tint * bright * (core + halo);
}

// 星雲用の fbm。3 オクターブで止める。星雲は色が薄く 4 段目の細部は見えないので、
// 1 回あたりのノイズ呼び出しを 4 から 3 に減らす (毎画素 4 回呼ぶため効く)
float fbm3(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s / 0.875;
}

// 稜線用の fbm。谷で折り返した (ridge) ノイズを重ね、尖った峰の形にする
float ridgeFbm(float x, float seed) {
  float s = 0.0;
  float a = 0.5;
  float f = 1.0;
  for (int i = 0; i < 4; i++) {
    float n = vnoise(vec2(x * f, seed + float(i) * 3.1));
    float rg = 1.0 - abs(2.0 * n - 1.0);
    s += a * rg * rg;
    f *= 2.07;
    a *= 0.5;
  }
  return s / 0.9375;
}

// 奥の山並みと手前の山並み。画面下端から約 12% を占める高さに収める
// amp は稜線の高さの係数。縦長では稜線が画面の高い位置まで立ち上がりすぎるため下げる
float ridgeFar(float u, float amp) {
  return -0.86 + amp * 0.13 * ridgeFbm(u * 3.0 + 3.1, 0.0);
}
float ridgeNear(float u, float amp) {
  return -0.95 + amp * 0.10 * ridgeFbm(u * 4.6 + 11.7, 40.0);
}

// 太陽の縁のダイヤモンドリング。角度は左上 (コロナの明るい側) に置く
const float ANG_D = 2.05;

// 回折スパイク 1 本。線の幅と長さをローレンツ型で減衰させ、点光源の裾を写真らしく引く
float spike(vec2 q, float ang, float len, float width) {
  vec2 u = vec2(cos(ang), sin(ang));
  float along = dot(q, u);
  float perp = dot(q, vec2(-u.y, u.x));
  float across = 1.0 / (1.0 + (perp * perp) / (width * width));
  float falloff = 1.0 / (1.0 + (along * along) / (len * len));
  return across * falloff;
}

void main() {
  vec2 res = uResolution;
  // 1 ピクセルの長さ (p の単位)。星と惑星の太さをピクセル基準で決める
  float pxU = 2.0 / res.y;
  // 縦を [-1, 1] に正規化した座標。縦横比は uAspect で扱うので月は必ず円に見える
  vec2 p = (gl_FragCoord.xy - 0.5 * res) / (0.5 * res.y);
  // 縦横の切り替えは aspect の関数として滑らかに混ぜる。硬い分岐だと、ウィンドウを
  // 少し動かしただけで太陽や星が飛ぶように見える。0.6 で完全な縦、1.2 で完全な横
  float portrait = 1.0 - smoothstep(0.6, 1.2, uAspect);

  // 月は上の方に置く。横長では中央より右上寄りにして、中央のパネルの文字の背景を暗く保つ
  // 縦長では太陽をやや小さく、上へ寄せる。中央の h1 タイトルにコロナが重ならないようにするため
  float R = mix(0.165, 0.115, portrait);
  vec2 C = mix(vec2(0.36 * uAspect, 0.40), vec2(0.0, 0.66), portrait) + uShift;

  vec2 d = p - C;
  float dl = length(d);
  float r = dl / R; // 1 が月の縁
  // 方向は正規化で求める。atan や cos/sin を毎画素呼ぶ必要がない
  vec2 dir = d / max(dl, 1e-6);
  float x = r - 1.0; // 縁からの距離 (R 単位)
  float xp = max(x, 0.0);
  float aa = 1.2 / (0.5 * res.y) / R; // 縁のアンチエイリアス幅 (1.2px)
  float disc = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r);
  float rAmp = mix(1.0, 0.5, portrait);

  // 山。稜線の最大高さより上の画素では計算を省く。その範囲のマスクは必ず 0 なので結果は変わらない
  // 奥の稜線の最大高さは約 -0.73、手前は約 -0.85
  vec2 pFar = p - uShift * 2.0;
  vec2 pNear = p - uShift * 3.0;
  float maskFar = 0.0;
  float maskNear = 0.0;
  vec3 farCol = vec3(0.0);
  vec3 nearCol = vec3(0.0);
  if (pFar.y < -0.70) {
    float depthFar = ridgeFar(pFar.x / uAspect, rAmp) - pFar.y;
    maskFar = smoothstep(-1.2 * pxU, 1.2 * pxU, depthFar);
    // 奥の山は深い青灰色。上端だけわずかに明るくして、空との境目を見分けやすくする
    farCol = mix(vec3(0.024, 0.030, 0.054), vec3(0.036, 0.036, 0.056), exp(-max(depthFar, 0.0) * 9.0) * 0.5);
  }
  if (pNear.y < -0.80) {
    float uN = pNear.x / uAspect;
    float depth = ridgeNear(uN, rAmp) - pNear.y;
    // 稜線 1 ピクセル分だけ境界をなめらかにする。硬い線だと切り抜きに見える
    maskNear = smoothstep(-1.2 * pxU, 1.2 * pxU, depth);
    // 縁光は稜線の直下でしか見えない。傾きの計算 (ridge を 2 回) もその範囲だけで行う
    float rimN = 0.0;
    if (depth < 0.1) {
      float slopeN = ridgeNear(uN + 0.006, rAmp) - ridgeNear(uN - 0.006, rAmp);
      float sideLit = clamp(0.5 - 8.0 * slopeN, 0.0, 1.0);
      rimN = exp(-max(depth, 0.0) / 0.018) * (0.3 + 0.7 * sideLit);
    }
    // 手前の山はほぼ黒。稜線の上端だけ琥珀の細い縁を乗せ、地平の残光が輪郭に残るようにする
    nearCol = vec3(0.004, 0.006, 0.012) + vec3(1.0, 0.58, 0.26) * 0.07 * rimN;
  }

  // 空・星・星雲・コロナは、山か月円盤で完全に隠れる画素では計算しない。
  // 隠れる画素の色は山か黒だけで決まるため、ここを飛ばしても見た目は変わらない
  vec3 outer = farCol;
  if (disc < 1.0 && maskFar < 1.0 && maskNear < 1.0) {
    // 空: 深い青紫 (灰色に見えないよう緑を少なく)。下の方がわずかに明るい
    float sy = clamp(p.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 sky = mix(vec3(0.006, 0.012, 0.056), vec3(0.010, 0.018, 0.078), 1.0 - sy);
    // 太陽の周りだけ青紫に寄せる。月の縁のすぐ外が一番濃く、遠ざかると紺色に戻る
    sky += vec3(0.010, 0.004, 0.038) * exp(-max(r - 1.0, 0.0) * 0.7);
    // 画面下端の淡い琥珀の残光と、山の上から上へ単調に消える縦のグラデーション
    sky += vec3(0.012, 0.007, 0.004) * exp(-pow((p.y + 0.85) / 0.55, 2.0));
    vec3 hazeBand = mix(vec3(1.0, 0.58, 0.26), vec3(0.80, 0.46, 0.44), clamp((p.y + 0.86) / 0.5, 0.0, 1.0));
    sky += hazeBand * exp(-max(p.y + 0.86, 0.0) * 2.6) * 0.05;

    // 天の川の淡い帯。帯から遠い画素は指数でほぼ 0 なので塵の噪音を呼ばない
    vec2 bdir = normalize(vec2(1.0, 0.35));
    float bd = dot(p - vec2(0.0, -0.15), vec2(-bdir.y, bdir.x));
    vec3 milky = vec3(0.0);
    if (abs(bd) < 0.7) {
      float dust = vnoise(p * 3.0 + 4.0) * 0.6 + vnoise(p * 7.0) * 0.4;
      milky = vec3(0.55, 0.62, 0.85) * exp(-bd * bd * 14.0) * (0.25 + 0.5 * dust) * 0.035;
    }

    // 低彩度の星雲。domain warp で雲の流れを作り、暗い塵の筋で切る。
    // lanes は星の減光にも使うので全画素で必要。nn は月の近くでは効かないので省く
    vec2 nq = p * 1.2 + uShift * 0.5;
    vec2 nw = vec2(fbm3(nq + vec2(0.0, uTime * 0.003)), fbm3(nq + vec2(5.2, 1.3)));
    float lane = fbm3(nq * 1.7 + 2.0 * nw + vec2(-0.4, 0.9));
    float lanes = smoothstep(0.52, 0.68, lane);
    float nebMask = smoothstep(0.25, 0.9, dl);
    float nn = nebMask > 0.0 ? fbm3(nq * 1.1 + 1.6 * nw) : 0.0;
    float neb = smoothstep(0.38, 0.8, nn) * (1.0 - 0.8 * lanes) * nebMask;
    // 星雲は色を抑える。紫を強くすると写真でなくイラストに見えるため、ほぼ灰青の霞にとどめる
    vec3 nebCol = mix(vec3(0.060, 0.055, 0.085), vec3(0.040, 0.060, 0.075), smoothstep(0.42, 0.62, nw.x));
    sky += nebCol * neb * 0.22;

    // 星と惑星。視差は弱く、星は背景なので動きも少なめ
    // 縦長は画面の面積が横長の約 1/4 しかないので、セルの当たり確率を上げて星の数を保つ
    vec3 starCol = stars(p + uShift * 0.3, 0.075, mix(0.30, 0.70, portrait), pxU);
    // 惑星はパネルの文字の列に重ならない位置へ置く。縦長では左の太陽寄りの空へ移す (h1 の上)
    vec2 P1 = mix(vec2(-0.66 * uAspect, 0.60), vec2(-0.85 * uAspect, 0.75), portrait);
    vec3 planets = planet(p, P1, pxU * 2.6, vec3(1.0, 0.97, 0.9), 3.0)
      + planet(p, vec2(0.66 * uAspect, -0.62), pxU * 2.4, vec3(1.0, 0.9, 0.75), 2.4)
      + planet(p, vec2(-0.44 * uAspect, -0.66), pxU * 2.0, vec3(0.8, 0.9, 1.0), 1.8);

    // 内側コロナ: 縁のすぐ上で非常に明るく滑らかに落ちる。実物の写真でも縁だけが白く飛ぶ。
    // 減衰を緩めて段階的に落とす。急だと縁の数ピクセルだけが飽和し、白い一本の輪に見える
    float inner = exp(-xp * 2.4) * 0.9 + exp(-xp * 6.5) * 0.35;
    // 外側の放射減衰は実物に合わせて r^-2.5。線形だと全周が同じ串に見える
    float pw = pow(max(r, 1.0), -2.5);
    float rc = max(r, 1.0);
    // 角度だけの低周波ノイズ。筋の濃淡をゆっくり変え、全周を均一にしない
    float slowA = vnoise(dir * 2.2 + vec2(1.7, uTime * 0.01));
    // 細いフィラメント: 角度方向に細かく、半径方向には長く伸ばす。角度を低周波でずらして筋をうねらせる
    float warp = vnoise(dir * 2.0 + vec2(4.0, 0.5));
    float f1 = vnoise(dir * 24.0 + vec2(1.4 * warp, rc * 0.35 - uTime * 0.01));
    float f2 = vnoise(dir * 41.0 + vec2(7.3, rc * 0.6 + uTime * 0.015));
    float fil = smoothstep(0.30, 0.85, 0.6 * f1 + 0.4 * f2);
    // 極の高い周波数の筋は太陽の串になりやすい。極側だけ筋のコントラストを 4 割ほど落とす
    float filC = mix(fil, 0.6 * fil + 0.16, smoothstep(0.55, 0.95, abs(dir.x)));

    // 赤道方向の長い筋: 左右に 1 本ずつ。横長では半径 4.6 まで届く。
    // 縦長は画面の半幅が半径の約 4 倍しかなく、長いと画面の端で切れて見えるため 2.8 で止める
    // 帯の外は exp と smoothstep で必ず 0 になるので、その範囲は計算を飛ばす
    float reach = mix(4.6, 2.8, portrait);
    vec2 qn = d / R;
    float ax = abs(qn.x);
    float streamer = 0.0;
    if (ax < reach && abs(qn.y) < 0.6) {
      float sx = max(ax - 1.0, 0.0);
      float yc = 0.015 * (1.0 - exp(-sx));
      float wid = 0.09 / (1.0 + 0.30 * sx);
      float across = exp(-pow((qn.y - yc) / wid, 2.0));
      // 末端は 1 - smoothstep で書く。smoothstep(大, 小, x) は GLSL 仕様上 未定義
      float along = exp(-sx * 0.45) * (1.0 - smoothstep(reach - 1.2, reach, ax));
      streamer = across * along * (0.3 + 0.7 * filC) * 0.34;
    }

    // 極方向の短いプルーム。細い糸を根元だけ強く出して、すぐに消える
    float plume = 0.0;
    if (xp < 3.5) {
      float polBand = exp(-pow(dir.x / 0.22, 2.0));
      plume = polBand * exp(-xp / 0.45) * (0.2 + 0.8 * filC) * pw * 0.5;
    }

    // 全周に薄く広がる外側コロナ。赤道側をわずかに明るくして左右の偏りを出す
    float eqSoft = exp(-pow(dir.y / 0.6, 2.0));
    float filSector = smoothstep(0.25, 0.75, slowA);
    float base = pw * (0.45 + 0.25 * slowA) * (0.6 + 0.4 * eqSoft) * (0.55 + 0.45 * filC * filSector);
    // 真珠色の外側の光。低周波だけで作るので、縁から 3 半径ほどまで滑らかに消える
    float pearl = exp(-xp * 0.45) * 0.16 * (0.8 + 0.2 * slowA);
    // ゆっくり揺れる。位相をずらして全体が一斉に動かないようにする
    float shimmer = 0.96 + 0.04 * sin(uTime * 0.5 + r * 3.0 + slowA * 6.0);
    float corona = (inner * (0.8 + 0.2 * slowA) + base + streamer + plume + pearl) * shimmer;
    // 縁の近くは真珠色の白にわずかに暖色を残し、外へ行くほど中性に寄せる。青く飛ばさない
    vec3 coronaCol = mix(vec3(1.0, 0.97, 0.92), vec3(0.82, 0.87, 0.98), smoothstep(1.0, 2.2, r));

    // 縁から立ち上がる赤いプロミネンス。角度・高さ・太さを乱数で決める。
    // 縁の外 2 半径より先は指数で消えるので、その範囲だけ 6 本分の計算をする
    float prom = 0.0;
    if (x > 0.0 && x < 2.0) {
      float th = atan(d.y, d.x);
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float a = hash12(vec2(fi, 3.7)) * 6.2831 - 3.1416;
        // 実際のプロミネンスは太陽半径の 1 割前後の小さな炎。大きく太くすると十字形の桃色の塊に見えるため小さく保つ
        float h = 0.05 + 0.08 * hash12(vec2(fi, 9.1));
        float w = 0.035 + 0.035 * hash12(vec2(fi, 4.4));
        // 明るさも 1 本ずつ変え、いくつかはほとんど見えないようにする (等間隔に同じ強さで並ぶと人工的に見える)
        float lum = pow(hash12(vec2(fi, 6.6)), 1.5);
        float da = atan(sin(th - a), cos(th - a));
        // 根元は太く、先へ行くほど細くなる (ループ状の突出)
        float ang = exp(-da * da / (w * w * (0.4 + 0.6 * xp / h)));
        float rad = smoothstep(0.0, 0.02, x) * exp(-xp / h);
        prom += ang * rad * lum * (0.85 + 0.15 * sin(uTime * 0.6 + fi));
      }
    }
    vec3 promCol = vec3(1.0, 0.22, 0.36);

    // 彩層: 縁の直上にある薄い赤い帯。縁から離れると消えるので、縁の近くだけ噪音を呼ぶ
    float ring = 0.0;
    if (abs(x) < 0.15) {
      ring = exp(-(x * x) / (0.035 * 0.035)) * (0.6 + 0.4 * vnoise(dir * 45.0 + 1.3));
    }
    // 強すぎると縁全体がネオンのピンクになるので、弱く、やや白みを残す
    vec3 ringCol = vec3(1.0, 0.42, 0.48) * ring * 0.55;

    outer = sky + milky + starCol * (1.0 - 0.6 * lanes) + planets
      + coronaCol * corona
      + promCol * prom * 1.4
      + ringCol;
    // 奥の山は空の上に重ねる。星や天の川を含めて完全に隠す
    outer = mix(outer, farCol, maskFar);
  }
  // 手前の山は最後に上から重ねる
  outer = mix(outer, nearCol, maskNear);

  // 月円盤は真っ黒。外縁のアンチエイリアスだけ mix で滑らかにつなぐ
  vec3 col = mix(outer, vec3(0.0015, 0.0018, 0.0035), disc);

  // ダイヤモンドリング: 核 + 小さなにじみ + 広いブルーム。
  // 縁の上に乗る光なので円盤の後で足し、黒い円盤の上にも出るようにする
  vec2 B = C + R * vec2(cos(ANG_D), sin(ANG_D));
  vec2 q = p - B;
  float db2 = dot(q, q);
  float dcore = exp(-db2 / 0.00003);
  float dbloom1 = 1.0 / (1.0 + db2 / (0.010 * 0.010));
  float dbloom2 = 1.0 / (1.0 + db2 / (0.04 * 0.04));
  // 回折スパイクは十字に 2 本だけ。きらめく程度の長さにとどめる。
  // 光条は縁の外に出る光なので、黒い円盤の上では消す。尾が円盤を横切ると傷のように見える
  float dsp = (spike(q, 0.0, 0.10, 0.0014) * 0.12 + spike(q, 1.5708, 0.08, 0.0012) * 0.05) * (1.0 - disc);
  // ダイヤの脈動は約 7 秒の周期。速いと瞬きに見え、落ち着いた月食らしさが消える
  float dsparkle = 0.85 + 0.15 * sin(uTime * 0.9);
  vec3 diamond = vec3(1.0, 0.97, 0.92) * dcore * 1.8
    + vec3(1.0, 0.86, 0.66) * dbloom1 * 0.5
    + vec3(1.0, 0.9, 0.78) * dbloom2 * 0.06
    + vec3(1.0, 0.96, 0.9) * dsp * dsparkle;

  // Baily's beads: 谷を抜けた光が縁に点々と並ぶ。縁から離れた画素には届かないので飛ばす。
  // ビーズは小さく、ゆっくり揺らす。強く明滅させると縁がちらついて見える
  vec3 beads = vec3(0.0);
  if (abs(r - 1.0) < 0.35) {
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float o = (fi - 2.0) * 0.12;
      vec2 bq = p - (C + R * 1.004 * vec2(cos(ANG_D + o), sin(ANG_D + o)));
      float bd2 = dot(bq, bq);
      float btw = 0.8 + 0.2 * sin(uTime * (0.5 + fi * 0.13) + fi * 2.1);
      beads += vec3(1.0, 0.97, 0.92) * exp(-bd2 / 0.000016) * 0.55 * btw * exp(-abs(o) * 1.8);
    }
  }
  col += (diamond + beads) * 0.9;

  // 周辺減光。四隅をわずかに落として視線を中央の月へ戻す。強すぎると黒い枠になる
  vec2 uv = gl_FragCoord.xy / res - 0.5;
  col *= 1.0 - 0.30 * smoothstep(0.30, 0.80, length(uv * vec2(1.0, 1.25)));

  // 色相を保つ肩のあるトーンカーブ。RGB を別々に丸めると明るい所が白へ抜けて、
  // コロナが平らな白い輪になるため、輝度だけを圧縮して色味は残す (拡張 Reinhard)
  float Y = dot(col, vec3(0.2126, 0.7152, 0.0722)) * 1.2;
  float Yt = Y * (1.0 + Y / 6.25) / (1.0 + Y);
  col = min(col * 1.2 * (Yt / max(Y, 1e-5)), vec3(1.0));
  // 三角分布のディザ (幅 ±1 階調)。一様ノイズより暗い階段がきれいに消える
  float dither = hash12(gl_FragCoord.xy) + hash12(gl_FragCoord.xy + 17.0) - 1.0;
  col += dither / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`

export function EclipseTheme() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  // 視差の目標値。毎フレーム uShift の現在値をここへ寄せる
  const target = useMemo(() => new THREE.Vector2(), [])

  // 描画中に new しないよう、uniform の箱はすべて初回に作る
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uAspect: { value: 1 },
      uShift: { value: new THREE.Vector2() },
    }),
    []
  )

  useFrame((state, delta) => {
    const mat = matRef.current
    if (!mat) return
    const { size, viewport, pointer, clock } = state
    // 描画バッファの実ピクセル数で渡す。dpr を掛けないと縁がぼやけて見える。
    // 縦横比もその場で更新し、リサイズや画面の回転で月が楕円にならないようにする
    mat.uniforms.uResolution.value.set(size.width * viewport.dpr, size.height * viewport.dpr)
    mat.uniforms.uAspect.value = size.width / size.height
    mat.uniforms.uTime.value = clock.elapsedTime

    // マウス視差は月の位置だけを少しずらす。ゆっくり追従させて落ち着いた動きにする
    target.set(pointer.x * 0.012, pointer.y * 0.008)
    const k = 1 - Math.exp(-delta * 1.5)
    mat.uniforms.uShift.value.lerp(target, k)
  })

  return (
    <>
      <color attach="background" args={["#02030a"]} />
      <mesh frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
    </>
  )
}
