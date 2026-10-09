"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

// 全画面の 1 枚のシェーダーで、杉の幹の層・月光の帯・蛍・塵を奥から手前へ重ねる。
// 頂点シェーダーは行列を使わず画面全体へ直接描く (カメラ設定に依存させないため)
const vertexShader = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const fragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uRes;
uniform vec2 uCam;
uniform float uF;
uniform vec2 uMoon;  // 月の位置 (p 空間)。縦長では画面の内側へ寄せる

const int NL = 12;        // 幹の層の数。多すぎると描画が重くなる
const float HCAM = 2.4;   // 地面からカメラまでの高さ
const float SP = 1.3;     // 幹の間隔 (world)
const float D0 = 2.2;     // 最も手前の層の奥行き
const float D1 = 160.0;   // 最も奥の層の奥行き
const float FOG = 0.055;  // 空気の濃さ (奥行きに対する指数減衰)

// 縦長の度合い (1 = 縦長、0 = 横長)。uF は縦横比から滑らかに決まるので、そこから導く
// 縦長では画面の横幅が p 空間で狭く、同じ大きさの葉の塊や草が横幅を占めすぎるため、要素の寸法をここで調整する
float portraitK() {
  return 1.0 - smoothstep(0.85, 1.6, uF);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
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

// 樹皮の縦筋と霧のゆらぎに使う。オクターブは 4 に抑えて重さを防ぐ
float fbm4(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s;
}

// 勾配ノイズ (0〜1 付近に収める)。値ノイズは格子の角が見えて四角い塊になるため、
// 樹冠の輪郭には格子が目立たない勾配ノイズを使う。5 次の補間で微分も滑らかにつなぐ
float gnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash22(i) * 2.0 - 1.0, f);
  float b = dot(hash22(i + vec2(1.0, 0.0)) * 2.0 - 1.0, f - vec2(1.0, 0.0));
  float c = dot(hash22(i + vec2(0.0, 1.0)) * 2.0 - 1.0, f - vec2(0.0, 1.0));
  float d = dot(hash22(i + vec2(1.0, 1.0)) * 2.0 - 1.0, f - vec2(1.0, 1.0));
  return 0.5 + 0.9 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// 樹冠の塊と隙間に使う勾配ノイズの fbm。値ノイズ版と同じ範囲になるよう振幅を合わせている
float fbmG4(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * gnoise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s;
}

// 樹冠: 上部の約 22% を覆う濃い葉の塊。下端は帯状にゆれ、幹がその中へ消えていく。
// 戻り値 x は被覆率、y は光の向きに面した縁の明るさ (縁だけ淡く光らせる)
const vec2 LDIR = vec2(-0.7, -0.714); // 光が来る向き (左下)
vec2 canopy(vec2 p, vec2 sw) {
  // 下端は p.y=0.295 より下へは出ないので、それより下は被覆も縁も 0 になる。
  // ノイズを使う前に返し、地面側の画素で fbm を 13 回も回さないようにする
  if (p.y < 0.29) return vec2(0.0);
  // 下端の高さを低周波でゆらす。一直線だと幕のように見えるため
  // 縦長では樹冠の下端を少し上げ、狭い画面の上部を黒く塞ぎすぎないようにする
  float pw = portraitK();
  float edgeY = mix(0.5, 0.6, pw) + 0.12 * (vnoise(vec2(p.x * 1.6, 3.1)) - 0.5) + 0.05 * (vnoise(vec2(p.x * 6.0, 7.7)) - 0.5);
  float below = smoothstep(edgeY - 0.12, edgeY + 0.02, p.y);
  // 葉の塊: fbm を閾値で切り、上ほど葉を濃くする。風の揺れは塊の位置だけに掛ける (月の隙間は動かさない)
  // 縦長では塊を細かくして、横幅の中に塊が数個だけ大きく並ぶのを防ぐ
  vec2 q = (p + sw) * vec2(4.6, 6.2) * mix(1.0, 1.35, pw) + vec2(5.0, 1.0);
  float n = fbmG4(q);
  // 縁の細かい毛羽立ち: 1 セルが十数 px になる勾配ノイズで閾値をゆらし、針葉のような輪郭にする。
  // 以前は 5px 程度の格子で揺らしていたため、輪郭が四角いブロックに見えていた
  // 塊の内側は閾値よりずっと濃いので影響を受けず、内部は暗いまま保たれる
  float fine = gnoise(p * vec2(26.0, 34.0) + sw * 50.0);
  float v = n + 0.25 * (p.y - edgeY) + (fine - 0.5) * 0.14;
  // 輪郭は画素の幅 (fwidth) だけぼかす。固定幅の smoothstep だと、拡大縮小で輪郭の硬さが変わるため
  float aaV = fwidth(v);
  float clump = smoothstep(0.52 - aaV, 0.52 + aaV, v);
  // 光の縁の帯だけは、輪郭から少し内側まで幅を持たせて使う
  float clumpSoft = smoothstep(0.44, 0.6, v);
  float dens = below * clump;
  // 月の周りは葉が抜けて空と月が見える。ほかにも小さな隙間を散らす
  // 縦長では画面の横幅が p 空間で狭いので、隙間も縮めて樹冠が左上に残るようにする
  float gs = mix(0.7, 1.0, smoothstep(0.85, 1.6, uF));
  float gap = smoothstep(0.16 * gs, 0.28 * gs, length((p - uMoon) * vec2(0.85, 1.0)));
  // 穴の fbm は葉がある所 (dens*gap>0) でしか使わないので、空の大部分では省く
  float occ = 0.0;
  if (dens * gap > 0.0) {
    float holeV = fbmG4(p * 2.3 + 9.0);
    float hole = smoothstep(0.72 - fwidth(holeV), 0.72 + fwidth(holeV), holeV);
    occ = dens * gap * (1.0 - 0.85 * hole);
  }
  // 光の方向へずらした点の密度が低ければ、その縁は光に面している
  // 縁の光は輪郭の帯だけに出す。内側まで光らせると灰色の斑点になり、岩のように見えるため
  // そのため帯の外では光の方向の fbm も不要になる
  float edgeBand = 4.0 * clumpSoft * (1.0 - clumpSoft);
  float lit = 0.0;
  if (edgeBand * below * gap > 0.0) {
    float nl = fbmG4(q + LDIR * vec2(0.1, 0.14));
    lit = clamp((n - nl) * 8.0, 0.0, 1.0) * edgeBand * below * gap;
  }
  return vec2(occ, lit);
}

// 1 本の光の柱。月から右下へ扇状に広がり、遠ざかると消える
float beamAt(vec2 q, float ang, float w0) {
  vec2 dB = vec2(cos(ang), sin(ang)); // 光の進む向き
  vec2 nB = vec2(-dB.y, dB.x);        // 進む向きに直交
  float along = dot(q, dB);
  if (along < 0.0) return 0.0;
  float across = dot(q, nB);
  float s = across / (w0 + 0.2 * along); // 遠いほど幅が広がる (扇状)
  float core = exp(-s * s * 1.6);
  // 霧のむらで筋を途切れさせ、空気の濃淡に見せる
  float mist = 0.3 + 0.7 * vnoise(vec2(across / max(along, 0.05) * 8.0, along * 1.3 - uTime * 0.03));
  return core * mist * exp(-along * 1.6);
}

// 月光の筋。樹冠の隙間から差す 3 本の柱。起点と向きを少しずつずらし、同じ形の繰り返しを避ける
float shaftAt(vec2 p) {
  vec2 q = p - uMoon;
  return 0.6 * beamAt(q, -0.93, 0.05)
    + 0.3 * beamAt(q - vec2(0.05, -0.03), -0.84, 0.04)
    + 0.2 * beamAt(q + vec2(-0.04, 0.05), -1.02, 0.06);
}

// 蛍の光。黄緑寄りの小さく明るい芯 (2〜3px) と、広くて弱い光輪からなる。
// r は芯の半径で、手前の蛍ほど大きく、奥の蛍ほど小さく渡す
vec3 fireflyGlow(vec2 dv, float r, float I, vec3 tint) {
  float d = length(dv);
  float core = exp(-(d * d) / (r * r));
  // 光輪は芯の 2 倍ほどのガウスで広げる。指数減衰だと裾が長く、配置セルの境目で光が切れて四角く見えるため
  float rh = r * 2.0;
  float halo = exp(-(d * d) / (rh * rh)) * 0.35;
  // 芯は白に寄せすぎない。白くなると蛍が月の白と同じ色になり、黄緑の彩度が消えるため
  vec3 hot = mix(tint, vec3(1.0, 1.0, 0.85), 0.3);
  // 光輪は色を残して広げ、やわらかいブルームに見せる
  return (tint * halo * 1.4 + hot * core) * I;
}

// 明滅: ふだんは薄く灯り、周期ごとに半分ほどが強く瞬く。周期も蛍ごとに違う
float blinkAt(float seed, float t) {
  // 周期の揺れは速度が負にならない小ささに抑える。位相が連続なので、周期の切れ目で光が飛ばない
  float x = t * (0.05 + 0.08 * hash12(vec2(seed, 3.0))) + hash12(vec2(seed, 5.0))
    + 0.1 * sin(t * 0.3 + seed * 6.0);
  float ph = fract(x);
  float bright = step(0.45, hash12(vec2(seed, floor(x))));
  // 立ち上がりを緩め、ふっと灯って消えるように見せる (急だとシャッターのように跳ねる)
  float flash = smoothstep(0.0, 0.05, ph) * exp(-ph * 5.0);
  return 0.2 + 0.06 * sin(t * 0.5 + seed * 6.0) + bright * flash * 1.3;
}

// 蛍の漂い: 2 つの周期を重ねた緩やかな曲線。直線で動くと機械的に見えるため。
// 振れ幅 a と速さは、画面高さの約 1% を数秒かけて渡る程度に抑える
vec2 drift(float seed, float t, float a) {
  return a * vec2(
    sin(t * 0.2 + seed * 40.0) + 0.35 * sin(t * 0.53 + seed * 17.0),
    cos(t * 0.17 + seed * 27.0) + 0.35 * cos(t * 0.43 + seed * 11.0)
  );
}

// 地面近くの蛍の群れ。画面下部の帯を数百匹が漂う。
// 1 匹ずつセルに置き、近傍 3x3 だけを足す (全数を見ると重すぎるため)
vec3 fireSwarm(vec2 p, float t) {
  // 下の約 45% に集め、上へ行くほど疎にする。中央と上の空は暗いまま
  float env = exp(-pow(max(p.y + 0.7, 0.0) / 0.28, 2.0));
  if (env < 0.01) return vec3(0.0);
  // 注意: 漂いの振れ幅は 0.04 のセル内に収めている。広げると隣のセルとの境が見える
  // セルは 0.04。蛍の振れ幅 (0.01) を足しても 3x3 の外へ出ないので、つなぎ目が見えない
  vec2 ci = floor(p / 0.04);
  vec3 acc = vec3(0.0);
  for (int jy = -1; jy <= 1; jy++) {
    for (int jx = -1; jx <= 1; jx++) {
      vec2 c = ci + vec2(float(jx), float(jy));
      // 群れは一様に散らさず、低い周波数のノイズでまとまりと空きを作る。均一だと光の粉のように見えるため
      // 判定はセル座標だけで決まるので、どの画素から見ても同じ蛍が残り、継ぎ目は出ない
      float clump = vnoise(c * 0.17 + 7.0);
      float h = hash12(c + 17.0);
      if (h > mix(0.15, 0.6, clump)) continue;
      // 約 1 割は手前の大きめの蛍。残りは小さく暗い点
      float near = step(0.9, hash12(c + 61.0));
      // 基点はセルの中ほどに寄せ、漂いが隣のセルの外へ出ないようにする (つなぎ目の切れを防ぐ)
      vec2 fp0 = (c + 0.3 + 0.4 * hash22(c + 5.0)) * 0.04;
      // 基点が遠い蛍は光が画素に届かない (漂いの振れ 0.011 + 光の裾 0.065)。
      // 漂いと明滅の計算を省くため、距離で先に切る
      if (dot(p - fp0, p - fp0) > 0.065 * 0.065) continue;
      // ゆっくり曲線を描いて漂う。速いと目が追ってしまい、群れが生き物に見えなくなる
      vec2 fp = fp0 + drift(h, t, 0.008);
      float I = blinkAt(hash12(c + 23.0) * 50.0 + 1.0, t);
      float r = mix(0.006, 0.0095, near);
      vec3 tint = mix(vec3(0.7, 1.0, 0.3), vec3(0.98, 0.92, 0.42), hash12(c + 71.0));
      acc += fireflyGlow(p - fp, r, I, tint) * mix(0.55, 1.0, near);
    }
  }
  return acc * env;
}

// 手前の草と小さなシダの影絵。草は列ごとに 2 本ずつ、高さ・幅・反り・傾きを変える。
// 戻り値の x が被覆、y は先端に当たる月光 (先端だけ淡く光らせる)
vec2 foliage(vec2 p, float aa) {
  // 最も高い草の先端は y=-0.66、シダは -0.82 まで。それより上は影絵が無いので計算を省く
  if (p.y > -0.66) return vec2(0.0);
  const float base = -1.12;
  vec2 res = vec2(0.0);
  float ci = floor(p.x / 0.06);
  for (int k = -3; k <= 3; k++) {
    for (int m = 0; m < 2; m++) {
      float j = ci + float(k);
      float sd = float(m) * 31.0;
      float h1 = hash12(vec2(j, 2.0 + sd));
      float h2 = hash12(vec2(j, 7.0 + sd));
      float h3 = hash12(vec2(j, 13.0 + sd));
      float h4 = hash12(vec2(j, 19.0 + sd));
      float h5 = hash12(vec2(j, 29.0 + sd));
      // 高さは低いものが多く、ときどき高い草。後列 (m=1) は少し低く置く
      // 縦長では草を低くし、手前の草が画面の下 1/4 を塞がないようにする
      float hb = (0.08 + 0.38 * h1 * h1) * mix(1.0, 0.65, float(m)) * mix(1.0, 0.78, portraitK());
      float xr = (j + 0.5 + (h2 - 0.5) * 0.9) * 0.06;
      if (p.y > base && p.y < base + hb) {
        float s = (p.y - base) / hb;
        // 根元の傾きと先端の反りを葉ごとに変え、同じ形の繰り返しを避ける
        float x = xr + (h3 - 0.5) * 0.14 * s + (h4 - 0.5) * 0.3 * s * s;
        // 幅は根元で太く先へ細く。太さも葉ごとに違う
        float w = (0.003 + 0.009 * h5) * pow(1.0 - s, 0.9) + aa;
        float a = (1.0 - smoothstep(w - aa, w + aa, abs(p.x - x))) * (1.0 - smoothstep(0.85, 1.0, s));
        res.x = max(res.x, a);
        res.y = max(res.y, a * smoothstep(0.4, 1.0, s));
      }
    }
  }
  // シダ: 中央の茎の両側に小葉が並ぶ羽状の葉。数列ごとに 4 割ほど立つ
  float fi = floor(p.x / 0.5);
  for (int k = -1; k <= 1; k++) {
    float j = fi + float(k);
    if (hash12(vec2(j, 41.0)) > 0.6) {
      float fx = (j + 0.2 + 0.6 * hash12(vec2(j, 43.0))) * 0.5;
      float fh = 0.16 + 0.12 * hash12(vec2(j, 47.0));
      float fb = base + 0.02;
      float bend = (hash12(vec2(j, 53.0)) - 0.5) * 0.25;
      if (p.y > fb && p.y < fb + fh) {
        float s = (p.y - fb) / fh;
        float dx = abs(p.x - (fx + bend * s * s));
        // 小葉は根元で長く、先ほど短い。並びは茎に沿って等間隔
        float rung = fract(s * 14.0);
        float tooth = 1.0 - smoothstep(0.12, 0.5, abs(rung - 0.5));
        float len = (0.13 * (1.0 - s) + 0.03) * tooth;
        float leaf = 1.0 - smoothstep(len - aa, len + aa, dx);
        float stem = 1.0 - smoothstep(0.002, 0.002 + aa * 2.0, dx);
        float a = max(stem, leaf) * (1.0 - smoothstep(0.92, 1.0, s));
        res.x = max(res.x, a);
        res.y = max(res.y, a * smoothstep(0.5, 1.0, s) * 0.5);
      }
    }
  }
  return res;
}

// 0.9 を超える成分だけを 1.0 へ向けて緩やかに寄せる。0.9 以下はそのままなので、中間調の色は変わらない
vec3 softCap(vec3 c) {
  vec3 over = max(c - 0.9, 0.0);
  return min(c, vec3(0.9)) + 0.1 * (1.0 - exp(-over / 0.1));
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  // p.y=0 が地平線。画面の縦幅で割るので端末の向きが変わっても形が崩れない
  vec2 p = (frag - 0.5 * uRes) / (0.5 * uRes.y);
  p.y -= 0.08;

  float t = uTime;
  // 月までの距離は何度も使うので一度だけ求める
  float dm = length(p - uMoon);
  vec3 Lm = normalize(vec3(-0.55, 0.5, -0.65)); // 月の方向 (面の法線との内積で明るさを出す)
  vec3 moonCol = vec3(0.78, 0.86, 1.0);
  // 霧は灰色にせず青緑寄りにする。灰色の霧が全体にかかると、夜の森が曇ったように見えるため
  vec3 fogLow = vec3(0.14, 0.23, 0.26);
  vec3 fogHigh = vec3(0.03, 0.055, 0.075);
  // 霧の色と月の近くの明るさは層によらないので、層の外で一度だけ求める
  vec3 fogC = mix(fogLow, fogHigh, smoothstep(-0.3, 0.6, p.y));
  float moonNear = exp(-dm * 2.4);

  vec3 col;
  // 星の明るさ。幹の被覆率で後から減衰させ、空の隙間にだけ見せる
  float starI = 0.0;
  if (p.y >= 0.0) {
    // 空: 地平線付近は霧色、上へ行くほど深い藍
    col = mix(fogLow * 0.9, vec3(0.010, 0.016, 0.040), smoothstep(0.0, 0.8, p.y));

    // 星: 数は少なく、1 つずつ小さく鋭く。明るさは控えめにする
    vec2 sg = p * 170.0;
    vec2 sc = floor(sg);
    float hs = hash12(sc);
    if (hs > 0.985) {
      vec2 sp = (hash22(sc + 3.7) * 0.7 + 0.15) - fract(sg);
      // またたきは遅く、わずかに。速いと星が点滅して見えてしまうため
      float tw = 0.8 + 0.2 * sin(t * (0.3 + hs * 0.8) + hs * 40.0);
      starI = (1.0 - smoothstep(0.0, 0.22, length(sp))) * (hs - 0.95) * 8.0 * tw;
    }
  } else {
    // 地面: 針葉の積もった暗い土。奥ほど霧に溶ける
    float dg = -HCAM * uF / p.y;
    vec2 wg = vec2(p.x * dg / uF + uCam.x, dg);
    float gn = fbm4(vec2(wg.x * 0.9, wg.y * 0.35) + 4.0);
    // 地面の暗がりは緑を少し混ぜる。純粋な黒や灰にせず、夜の森の土の色に寄せる
    vec3 gcol = vec3(0.020, 0.033, 0.030) * (0.5 + 0.9 * gn);
    float fa = 1.0 - exp(-dg * FOG);
    col = mix(gcol, fogLow * 0.9, fa);
  }

  // 本文パネルが重なる中央の帯 (画面の下 20%〜80%)。ここでは光る要素を少し沈め、文字の後ろを暗く保つ。
  // 上の月と下の草・蛍は帯の外に残るので、全体は沈めずに文字の周りだけ落ち着かせる
  vec2 sfr = frag / uRes;
  // 縦長では見出しが画面の左寄りに来るので、横の範囲は広めにとる (見出しの後ろの幹も沈める)
  float pz = (1.0 - smoothstep(0.42, 0.56, abs(sfr.x - 0.5))) * smoothstep(0.2, 0.26, sfr.y) * (1.0 - smoothstep(0.8, 0.86, sfr.y));
  // 蛍は帯の中で暗くし、上半分ではさらに減らす (上の空に明るい点が散らないように)
  float fdim = mix(1.0, 0.4, pz) * mix(1.0, 0.6, smoothstep(0.5, 0.62, sfr.y));

  // 月光の筋は幹の後ろの空気に敷く。手前の幹が覆うので、幹の隙間からだけ光が見える
  float shaft = shaftAt(p) * mix(1.0, 0.5, pz);
  col += vec3(0.7, 0.8, 1.0) * shaft * 0.45;
  // 樹冠の被覆と縁の光。幹より後に被せ、幹の上端を隠す
  // 風の揺れは梢ほど大きく、幅は数ピクセルに抑える。速く揺れると樹冠が生き物ではなく幕に見えるため
  vec2 sw = vec2(0.0035 * sin(t * 0.13 + p.x * 1.7), 0.0012 * sin(t * 0.09 + 1.3)) * smoothstep(-0.1, 0.8, p.y);
  vec2 cn = canopy(p, sw);

  // 幹は 2 段で処理する。1) 手前から奥へ被覆と幹の形だけを求める (安い計算)。
  // 2) 奥から手前へ色を重ねる (色の合成は奥からしかできないため)。
  // 被覆がほぼ不透明になった層より奥は手前の幹に隠れるので、2) では飛ばして計算を省く
  float trK[NL];
  float dK[NL];
  float gyK[NL];
  float dxK[NL];
  float rK[NL];
  float idK[NL];
  // 幹の被覆率。奥の空 (星) を、幹の隙間の分だけ見せるために使う
  float cover = 0.0;
  int kStop = NL;
  for (int k = 0; k < NL; k++) {
    float tk = float(k) / float(NL - 1);
    float d = D0 * pow(D1 / D0, tk);
    float pxW = 2.0 / uRes.y * d / uF; // 1px が世界座標でどれだけか (エッジを滑らかにする)
    float gy = -HCAM * uF / d;         // この層の幹の根元の高さ (p 空間)
    // カメラを少し横へ動かした視差。奥の層ほど動きが小さく見える
    float Xw = p.x * d / uF + uCam.x;

    // 幹: 両隣の候補のうち最も近いものを採る。細い幹が多く、手前の層にだけ太い幹を混ぜる
    float bestN = 1e3;
    float bestDx = 0.0;
    float bestR = 0.3;
    float bestId = 0.0;
    float ci = floor(Xw / SP);
    for (int j = -1; j <= 1; j++) {
      float idx = ci + float(j);
      vec2 hh = hash22(vec2(idx, float(k) * 1.37 + 0.5));
      // 約 14% は抜いて、奥の空がのぞく隙間を作る
      if (hh.x < 0.86) {
        float cx = (idx + 0.5 + (hh.y - 0.5) * 0.5) * SP;
        float wsel = fract(hh.y * 17.3);
        float r = 0.14 + 0.2 * wsel * wsel;
        // 手前の層の一部だけ太くする。画面の端で大きな幹が一本だけ立つ見え方になる
        r *= 1.0 + 0.8 * step(0.8, wsel) * (1.0 - tk);
        float dx = Xw - cx;
        float nd = abs(dx) / r;
        if (nd < bestN) {
          bestN = nd;
          bestDx = dx;
          bestR = r;
          bestId = idx + float(k) * 0.61;
        }
      }
    }
    // 遠い幹ほど輪郭を柔らかくして、霧越しのシルエットに見せる
    float edge = pxW * (1.0 + 0.12 * d) / bestR;
    float tr = 1.0 - smoothstep(1.0 - edge, 1.0 + edge, bestN);
    // 幹の上端は樹冠の中 (y ≈ 0.6 以上) に置き、霧へ溶かさない。溶けると縦の線の幕になるため
    float topH = 0.62 + 0.2 * fract(bestId * 0.618 + 0.3);
    tr *= 1.0 - smoothstep(topH, topH + 0.2, p.y);
    // 根元は地面の霧へ少しずつ溶かす。step で切ると、幹の下端が明るい横線になってしまう
    tr *= smoothstep(gy - 0.12, gy + 0.22, p.y);
    // 月のまわりは幹が薄くなり、霞んだ月が幹の隙間からのぞく (全部消すと切り抜いたように見える)
    tr *= 1.0 - 0.55 * (1.0 - smoothstep(0.06, 0.24, dm));
    trK[k] = tr;
    dK[k] = d;
    gyK[k] = gy;
    dxK[k] = bestDx;
    rK[k] = bestR;
    idK[k] = bestId;
    cover += tr * (1.0 - cover);
    // 手前から数えて初めて被覆がほぼ 1 になった層。ここより奥は省く
    if (kStop == NL && cover >= 0.995) kStop = k;
  }

  // 幹の層を奥から手前へ重ねる。手前の層が奥の蛍や月光を隠すので奥行きが出る
  for (int i = 0; i < NL; i++) {
    int k = NL - 1 - i;
    if (k > kStop) continue;
    float tr = trK[k];
    float d = dK[k];
    float gy = gyK[k];
    float bestDx = dxK[k];
    float bestR = rK[k];
    float bestId = idK[k];

    if (tr > 0.0005) {
      float nx = clamp(bestDx / bestR, -0.999, 0.999);
      vec3 N = vec3(nx, 0.0, sqrt(1.0 - nx * nx));
      // 幹の表面の角度で繊維を数える。縁へ行くほど繊維が詰まり、円柱に沿って見える
      float ang = asin(nx);
      float Yw = p.y * d / uF;
      // 繊維は手前の 2〜3 層にだけ薄く出す。奥まで出すと同じ縦線が幕のように並ぶ
      // 奥の層は fibreK が 0 なので、繊維の fbm は手前の層でだけ計算する (結果は同じ)
      float fibreK = 1.0 - smoothstep(2.6, 4.6, d);
      float fur = 0.0;
      float bt = 0.5;
      if (fibreK > 0.0) {
        // 縦の繊維 (尾根) と細かい溝。手前ほど細かい溝を出す
        float f1 = vnoise(vec2(ang * 11.0 + bestId * 7.1, Yw * 0.7));
        float f2 = vnoise(vec2(ang * 13.0 + bestId * 3.3, Yw * 1.2));
        float fineK = 1.0 - smoothstep(10.0, 40.0, d);
        float ridge = pow(1.0 - abs(2.0 * f1 - 1.0), 2.0);
        fur = smoothstep(0.80, 0.93, vnoise(vec2(ang * 9.0 + bestId, Yw * 0.45))) * fibreK;
        float fib = 0.55 * ridge + 0.45 * mix(0.5, f2, fineK);
        // 繊維の濃淡は中心 0.5 のまわりに小さく振る
        bt = 0.5 + 0.22 * fibreK * (fib - 0.5) * 2.0;
      }
      // 樹皮の大きな濃淡は低い周波数だけ。まだらの模様を粗く出す
      bt *= 0.7 + 0.5 * vnoise(vec2(ang * 5.0 + bestId, Yw * 0.9));
      // 樹皮は茶を弱め、月光の青緑に馴染む色にする (暖色は蛍と月だけに残す)
      // 幹ごとに明るさを少し変える。同じ濃淡が並ぶと、森ではなく幕や柱の列に見えるため
      vec3 bark = vec3(0.090, 0.076, 0.068) * (0.25 + 0.95 * bt) * (1.0 - 0.6 * fur) * (0.8 + 0.4 * hash12(vec2(bestId, 9.0)));
      // 円柱の陰影: 縁は暗く、正面はわずかに明るい
      float cyl = 0.12 + 0.88 * pow(N.z, 0.8);
      float diff = pow(max(dot(N, Lm), 0.0), 0.8) * 0.9 + max(dot(N, vec3(-0.5, 0.2, 0.84)), 0.0) * 0.22;
      // 月側 (左) の縁だけ細く光らせる。芯は暗いままなので輪郭が立つ
      // 遠い幹の縁は光らせない。白い細線が幕のように並ぶのを防ぐ
      // 幅を広めにとり、細い白線ではなく月側の面がふくらむ光にする
      float rim = pow(max(-nx, 0.0), 2.0) * 0.6 * (1.0 - 0.75 * smoothstep(4.0, 12.0, d));
      vec3 lit = bark * cyl * (0.12 + diff * moonCol);
      // 影の底に青緑を少し持ち上げる。純黒の幹は背景の闇と溶け合い、輪郭が消えるため
      lit += vec3(0.004, 0.010, 0.012) * (1.0 - nx * nx);
      lit += moonCol * rim * (0.18 + 0.3 * bt) * (0.4 + moonNear);
      lit += vec3(0.5, 0.6, 0.8) * moonNear * (0.5 - 0.5 * nx) * 0.06;
      // 遠い幹は霧色に寄せるが、完全には溶かさず輪郭を残す
      // 霧色に寄せすぎると奥の幹が明るい縦縞として何十本も並ぶので、上限を下げて暗めに沈める
      float haze = (1.0 - exp(-d * FOG)) * 0.75;
      float mist = exp(-max(p.y - gy, 0.0) * 2.5) * 0.45;
      vec3 tc = mix(lit, fogC * 0.7, clamp(haze + mist * (1.0 - haze), 0.0, 1.0));
      // 根元は霧の色より地面の暗がりに寄せる。霧で持ち上がった幹の下端が明るい横線になるのを防ぐ
      tc *= mix(0.45, 1.0, smoothstep(gy, gy + 0.12, p.y));
      // 奥の幹は帯の中で一段暗くし、白っぽい縦線が文字の後ろに並ばないようにする
      tc *= mix(1.0, 0.72, pz * smoothstep(2.5, 8.0, d));
      col = mix(col, tc, tr);
    }

    // 根元の霧: 幹のない所でも地面付近を白く溶かす
    // 根元の霧は段差で切ると層の境目が横線になるので、広くなだらかに立ち上げる
    float gm = smoothstep(gy - 0.2, gy + 0.02, p.y) * exp(-(p.y - gy) * 2.0) * 0.10;
    col = mix(col, fogC, gm * (1.0 - tr));

    // 蛍: 層ごとに置き、手前の幹に隠れる。下の帯に集め、上へ行くほど減らす
    // 2x2 のセルは蛍の光より大きいので、画素の近くの蛍を取りこぼさない
    float envL = exp(-pow(max(p.y + 0.6, 0.0) / 0.3, 2.0));
    if (envL > 0.01) {
      // 奥の蛍は小さく、手前の蛍は大きく。芯の半径に上下限を置く
      float rc = clamp(0.014 * uF / d, 0.0055, 0.011);
      vec2 gp = p / 0.5;
      vec2 gc = floor(gp - 0.5);
      vec3 glow = vec3(0.0);
      for (int jy = 0; jy <= 1; jy++) {
        for (int jx = 0; jx <= 1; jx++) {
          vec2 cc = gc + vec2(float(jx), float(jy));
          vec2 hk = cc + vec2(float(k) * 3.7, float(k) * 1.9);
          float pres = hash12(hk + 0.5);
          if (pres > 0.5) {
            vec2 fp0 = (cc + 0.25 + 0.5 * hash22(hk + 11.0)) * 0.5;
            // 基点が遠い蛍は、漂い (0.031) と光の裾 (0.055) を足しても画素に届かない。
            // 漂いと明滅の計算を省くため、先に距離で切る
            if (dot(p - fp0, p - fp0) > 0.09 * 0.09) continue;
            // 手前の層ほど大きく動かすと奥行きが増す。奥は動きを小さく残す
            vec2 fp = fp0 + drift(pres, t, 0.016);
            float I = blinkAt(hash12(hk + 23.0) * 50.0 + float(k) * 0.37, t);
            vec3 tint = mix(vec3(0.7, 1.0, 0.3), vec3(0.98, 0.92, 0.42), hash12(hk + 71.0));
            glow += fireflyGlow(p - fp, rc, I, tint);
          }
        }
      }
      // 遠くの蛍は空気で弱まる
      col += glow * envL / (1.0 + d * 0.035) * fdim;
    }

    // 塵: 月光の筋の中だけで光る小さな粒。近い層にだけ置いて数を抑える
    if (shaft > 0.02 && d < 45.0) {
      vec2 mg = p / 0.045;
      vec2 mc = floor(mg - 0.5);
      float mt = 0.0;
      for (int jy = 0; jy <= 1; jy++) {
        for (int jx = 0; jx <= 1; jx++) {
          vec2 cc = mc + vec2(float(jx), float(jy));
          float hm = hash12(cc + float(k) * 5.3);
          vec2 mp = cc + 0.2 + 0.6 * hash22(cc * 1.7 + float(k))
            + 0.4 * vec2(sin(t * 0.15 + hm * 30.0), cos(t * 0.12 + hm * 21.0));
          float dd = length(mg - mp);
          float tw = 0.6 + 0.4 * sin(t * (0.6 + hm) + hm * 50.0);
          mt += (1.0 - smoothstep(0.0, 0.12, dd)) * step(0.88, hm) * tw;
        }
      }
      col += moonCol * mt * shaft * 0.9;
    }
  }

  // 月の光は幹より後ろにあるので、幹を描いた後に足す (先に描くと幹の霧で暗く沈むため)
  vec3 moonAdd = vec3(0.0);
  // 月: 小さく暖かい白。周縁を暗くして球に見せ、海の濃淡はノイズで出す。
  // 縁は大気でわずかにぼかし、硬い白い円にならないようにする
  vec2 mv = p - uMoon;
  const float MR = 0.068;
  // 月の放射・芯・霧のむらは月のごく近く (dm<0.15) でしか効かないので、そこだけ計算する。
  // 芯は 0.15 の外では e^-13 以下になり、8bit では見えない
  if (dm < 0.15) {
    // 薄い霧が月にかかり、明るさにむらが出る
    float veil = 0.8 + 0.2 * vnoise(p * 4.5 + vec2(t * 0.015, 0.0));
    // 縁は大気で少しにじませ、硬い白い円にならないようにする (逆向きの smoothstep は使わず、1 から引いて書く)
    float disc = 1.0 - smoothstep(MR - 0.014, MR, dm);
    if (dm < MR) {
      float mu = sqrt(max(1.0 - dm * dm / (MR * MR), 0.0));
      // 縁を少しだけ暗くして球に見せる。暗くしすぎると灰色に沈むので下限は高めにとる
      float limb = mix(0.8, 1.0, pow(mu, 0.5));
      // 海の濃淡は円の内側だけ (外では disc が 0 なので計算不要)
      float seas = smoothstep(0.42, 0.66, fbm4(mv * 20.0 + 3.0));
      float albedo = 0.95 - 0.2 * seas;
      // 輝度の肩で少し沈むので、月の放射は少し強めにして淡い白に保つ (灰色に見えないように)
      moonAdd += vec3(1.0, 0.96, 0.88) * disc * limb * albedo * veil * 1.15;
    }
    // 芯だけ明るく、縁へ向けて柔らかく落ちる。平らな円だと貼り付いたシールに見えるため
    float core = exp(-(dm * dm) / (MR * MR * 0.35));
    moonAdd += vec3(1.0, 0.97, 0.9) * core * veil * 1.15;
  }
  // 月のまわりの光輪。霧に散って広く、ゆっくりむらがある
  // 光輪は帯の中で弱める。月の真下のパネル上端に広く掛かり、文字の後ろで白く濁るのを防ぐ
  float halo = (exp(-dm * 2.6) * 0.32 + exp(-dm * 7.0) * 0.16) * mix(1.0, 0.5, pz);
  moonAdd += vec3(1.0, 0.92, 0.78) * halo * (0.6 + 0.4 * vnoise(p * 3.0 + vec2(t * 0.01, 2.0)));

  // 月は幹の被覆で少しだけ薄れる。全部隠すと幹の裏の月が消えて切り抜きに見えるため
  col += moonAdd * (1.0 - 0.6 * cover);

  // 樹冠を幹の前に被せる。幹は葉の中へ消え、隙間からだけ空と月が見える
  // 葉の内側はほぼ黒。月に面した縁にだけ薄い青白い光を残す
  // 葉の内側は深い黒に緑を少し混ぜる。完全な黒は画面の上部を切り抜いたように見せるため
  vec3 canopyCol = vec3(0.004, 0.011, 0.009) + moonCol * 0.07 * cn.y;
  col = mix(col, canopyCol, cn.x);

  // 地面近くの霧: 地面から浮いた帯がゆっくり横へ流れる。蛍の光はこの霧の上に乗せる
  // 霧の帯は上へ遠ざかると 1e-3 より薄くなり見えないので、その外では雲のノイズを計算しない
  float mband = exp(-pow((p.y + 0.62) / 0.22, 2.0));
  if (mband > 1e-3) {
    vec2 mq = vec2(p.x * 1.3 + t * 0.035, p.y * 3.0);
    float mn = 0.6 * vnoise(mq) + 0.4 * vnoise(mq * 2.1 + vec2(-t * 0.02, 4.0));
    // 地面の霧は灰色の帯にせず青緑に寄せ、量も抑える (以前は全体が白く曇って見えたため)
    col = mix(col, vec3(0.08, 0.13, 0.14), mband * smoothstep(0.35, 0.8, mn) * 0.25);
  }

  // 手前の群れ。幹より前に描くので、近い蛍は幹の上にも重なる
  // 手前の要素ほど視差を大きくする。群れと草は最も近いので、幹の層より大きく動かす
  col += fireSwarm(p + vec2(uCam.x * 0.45, 0.0), t) * fdim;
  // 手前の草とシダは蛍より前に描く。影絵の黒で下端の奥行きを作り、先端だけ月光を受ける
  vec2 fol = foliage(p + vec2(uCam.x * 0.6, 0.0), 2.0 / uRes.y);
  vec3 bladeCol = vec3(0.007, 0.016, 0.012) + moonCol * 0.07 * fol.y;
  col = mix(col, bladeCol, fol.x);

  // 手前の霧に散る月光の筋。幹の隙間に限らず、前の空気が光って見えるようにする
  col += moonCol * shaft * 0.07;

  // 霧を透かす月の光: 幹の前に薄く重ね、幹に隠れた月もぼんやり光らせる
  col += vec3(1.0, 0.92, 0.78) * exp(-dm * 3.0) * 0.04 * (0.5 + 0.5 * vnoise(p * 6.0 + vec2(t * 0.02, 0.0)));
  // 空の隙間の星。幹の被覆が少ないほど、また空の高い所ほど見える
  col += vec3(0.85, 0.9, 1.0) * starI * (1.0 - cover) * (1.0 - cn.x) * smoothstep(0.1, 0.5, p.y) * 0.6;

  // 周辺減光と階調のための丸め (暗部の帯状ノイズを消す)
  // 周辺減光は明るさだけを下げる。弱めにして、画面の隅が沈みすぎないようにする
  float vig = 1.0 - 0.3 * dot(p * 0.5, p * 0.5);
  col *= vig;
  // 輝度ベースの肩: 明るさだけを圧縮し、色相と彩度は保つ。
  // 成分ごとに exp をかけると黄緑の蛍が白へ抜け、月と同じ色になってしまうため
  float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col *= (1.0 - exp(-L * 1.3)) / max(L, 1e-4);
  // 成分が 1 を超えたときだけ、その上端を柔らかく丸める。硬い白飛びと平らな円を防ぐ
  col = softCap(col);
  col = pow(col, vec3(0.95));
  col += (hash12(frag + fract(t) * 17.0) - 0.5) / 255.0;
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`

export function FireflyForestTheme() {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uCam: { value: new THREE.Vector2() },
      uF: { value: 1.6 },
      uMoon: { value: new THREE.Vector2(-0.42, 0.68) },
    }),
    [],
  )

  // 毎フレームの値は material の uniforms に書く (レンダー中に hook の引数を書き換えない)
  const matRef = useRef<THREE.ShaderMaterial>(null)

  useFrame((state, delta) => {
    const mat = matRef.current
    if (!mat) return
    // 材質が持つ uniforms は Record<string, IUniform> 型なので、作ったときの形に戻して使う
    const u = mat.uniforms as typeof uniforms
    const { size, viewport, pointer, clock } = state
    u.uTime.value = clock.elapsedTime
    u.uRes.value.set(size.width * viewport.dpr, size.height * viewport.dpr)

    // 縦長の画面では視野を広げ、幹が多く見えるようにする
    const aspect = size.width / size.height
    const wide = THREE.MathUtils.smoothstep(aspect, 0.5, 1.2)
    u.uF.value = THREE.MathUtils.lerp(0.85, 1.6, wide)
    u.uMoon.value.set(THREE.MathUtils.lerp(-0.2, -0.42, wide), 0.68)

    // カーソルに寄せて横へ動く。動きは小さく、ゆっくり追従させる
    // 指数の補間にして、フレームレートが変わっても追従の速さが同じになるようにする
    const k = 1 - Math.exp(-delta * 1.2)
    u.uCam.value.x += (pointer.x * 0.25 - u.uCam.value.x) * k
  })

  return (
    <>
      <color attach="background" args={["#05080f"]} />
      <mesh frustumCulled={false} renderOrder={-1}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}
