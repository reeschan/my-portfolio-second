"use client"

import { useMemo, useRef } from "react"
import * as THREE from "three"
import { useFrame } from "@react-three/fiber"

// 画面全体を覆う 1 枚のシェーダー平面。頂点をクリップ空間に直接置くので、
// カメラの FOV や画面比に関係なく必ず全面が塗られる。
const SKY_VERT = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const SKY_FRAG = /* glsl */ `
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uPointer;

// 水平線 (p 座標、高さ基準は短辺)。下が湖、上が空と山。
// 空の計算は pn = p * 2 で行う (オーロラの弧の形を読みやすい単位にするため)
const float HZ = -0.12;
// 大気遠近の霞色。遠い山ほど空の色に近づく
const vec3 HAZE_FAR = vec3(0.095, 0.120, 0.170);
const vec3 HAZE_MID = vec3(0.040, 0.055, 0.085);

// 乱数: sin を使わない整数寄りのハッシュ。GPU ごとの精度差で模様が崩れにくい
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// 天の川の塵・空の雲用 (4 オクターブ)
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

// 稜線用の折り返しノイズ (ridged fbm)。1 - |n| の谷を二乗して尾根を尖らせ、谷は平らに残す
float ridged(float x, float seed) {
  float h = 0.0;
  float a = 0.5;
  float f = 1.0;
  float norm = 0.0;
  for (int i = 0; i < 4; i++) {
    float n = 1.0 - abs(vnoise(vec2(x * f + seed, seed * 0.37 + float(i) * 5.3)) * 2.0 - 1.0);
    h += a * n * n;
    norm += a;
    f *= 2.0;
    a *= 0.5;
  }
  // 尖りすぎると針のような細い峰になるので、なめらかなノイズを少し混ぜて根元を広げる
  return 0.8 * h / norm + 0.2 * vnoise(vec2(x * 1.5 + seed, seed * 0.9));
}

// 主峰を数か所だけ高くするマスク。山の高さを不規則にして「同じ山が並ぶ」感じを消す
float peakMask(float x, float seed) {
  return smoothstep(0.30, 0.75, vnoise(vec2(x * 0.6 + seed, seed * 1.7)));
}

// 縦長の画面では横幅が狭く峰が一つしか入らないので、稜線の周波数を画面比で上げる
float mtnScale() {
  float aspect = uRes.x / uRes.y;
  return 1.0 + clamp((1.2 - aspect) * 1.2, 0.0, 1.4);
}

// 縦長さの度合い (0 = 横長, 1 = 縦長)。画面比に応じて滑らかに変わる
float portraitAmt() {
  return clamp((1.0 - uRes.x / uRes.y) / 0.5, 0.0, 1.0);
}

// 山脈 3 層。奥ほど高く、手前ほど低い (大気遠近の前提になる高さの差)
float ridgeFar(float x) {
  float X = x * mtnScale();
  // 周波数を上げて峰の数を増やす。高さは据え置き (手前の層との高さの差を保つため)
  return HZ + 0.02 + 0.24 * pow(ridged(X * 2.3, 3.1), 1.2) * (0.65 + 0.35 * peakMask(X, 2.0));
}
float ridgeMid(float x) {
  float X = x * mtnScale();
  return HZ - 0.005 + 0.13 * pow(ridged(X * 2.6, 17.4), 1.3) * (0.45 + 0.55 * peakMask(X, 11.0));
}
float ridgeNear(float x) {
  float X = x * mtnScale();
  return HZ - 0.035 + 0.11 * ridged(X * 3.6, 41.9);
}

// 星 1 層分。セルごとに 1 個だけ置き、ガウシアンで丸く描く (正方形の点を避ける)
vec3 starField(vec2 px, float cellPx, float density, float rPx, float seed, float bandBoost) {
  vec2 g = px / cellPx;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash21(id + seed);
  // 天の川の帯では星が増える (実際の見え方に合わせる)
  float thr = 1.0 - density * (1.0 + 3.0 * bandBoost);
  if (h < thr) return vec3(0.0);

  vec2 off = (vec2(hash21(id + seed + 7.1), hash21(id + seed + 13.7)) - 0.5) * 0.8;
  vec2 d = (f - off) * cellPx;
  float mag = hash21(id + seed + 3.3);
  // 明るさはべき乗で分布させ、多くは暗く少数だけ明るい
  float b = pow(mag, 5.0) * 1.3 + 0.07;
  float temp = hash21(id + seed + 29.0);
  vec3 c = mix(vec3(0.62, 0.74, 1.0), vec3(1.0, 0.90, 0.74), temp);
  float core = exp(-dot(d, d) / (2.0 * rPx * rPx));
  // またたきは星ごとに位相をずらし、全体が同期しないようにする
  float twk = 0.87 + 0.13 * sin(uTime * (0.3 + 0.9 * temp) + mag * 60.0);
  return c * b * core * twk;
}

// 月: 周縁減光と海の濃淡。月の位置は画面比で左上へ寄せる
vec2 moonPos() {
  float ax = uRes.x / uRes.y;
  float w = clamp((ax - 0.6) / 1.0, 0.0, 1.0);
  return vec2(mix(-0.2, -0.52, w), mix(0.72, 0.30, w));
}

// 戻り値の xyz は月の光 (円盤と光輪)、w は円盤の被覆率。円盤は下の空と幕を置き換えて描く
vec4 moonLayer(vec2 p) {
  vec2 dv = p - moonPos();
  float d = length(dv);
  float r = 0.030;
  float disc = 1.0 - smoothstep(r - 0.0012, r + 0.0012, d);
  float limb = sqrt(max(1.0 - (d / r) * (d / r), 0.0));
  // 海の濃淡は円盤の中でしか使わないので、外ではノイズを引かない
  float maria = 0.0;
  if (disc > 0.0) maria = 0.86 + 0.14 * vnoise(dv * 70.0 + 3.0);
  float halo = exp(-d * 15.0) * 0.22 + exp(-d * 4.5) * 0.04;
  // 月は無彩色に近い白。円盤を加算すると後ろの緑の幕が乗って mint 色に濁るため、
  // 円盤は置き換えで描き、光輪だけを加算する
  vec3 lit = vec3(0.90, 0.91, 0.93) * (disc * (0.45 + 0.55 * limb) * maria * 1.2 + halo);
  return vec4(lit, disc);
}

// オーロラの幕 1 本。下端は連続した波打つ縁で、そこから上へ光の筋が垂れ下がる。
// 縁の明るい細い線と、縁の直下に出る細い紫の光だけを下側に置き、暗い帯は作らない。
// pa は縦長の度合い (aurora() で一度だけ求めて渡す)
vec3 curtain(vec2 pn, float s, float baseY, float seed, float strength, float pa) {
  float t = uTime;
  // 下端: 正弦 2 本と低周波ノイズで蛇行させる。位相を時間で流し、ゆっくり波打たせる
  float edge = baseY
    + 0.090 * sin(s * 2.3 + seed * 2.1 + t * 0.045)
    + 0.040 * sin(s * 5.1 - t * 0.031 + seed * 0.7)
    + 0.120 * (vnoise(vec2(s * 1.3 + seed * 4.3, t * 0.02)) - 0.5);
  float d = pn.y - edge;
  // 縁の少し下から、上へ遠くまでは計算を飛ばす (大半の画素はここで抜ける)
  // 下側の打ち切りは「下へ広がる光」の終端より遠くに置き、終端は smoothstep で落とす (波と一緒に動く硬い線を出さない)
  // 縦長では筋が上へ長く伸びるので、打ち切りも遠くへ動かす。打ち切りは硬い線になるため下で必ずぼかす
  float cutTop = 0.95 + 0.7 * pa;
  if (d < -0.12 || d > cutTop) return vec3(0.0);
  float topFade = 1.0 - smoothstep(cutTop - 0.001 - 0.25 * pa, cutTop, d);
  float up = max(d, 0.0);

  // 幕は折れ曲がったリボン。縁の傾きが急な所 (折り目) は視線方向に光が重なって明るくなる
  float slope = 0.090 * 2.3 * cos(s * 2.3 + seed * 2.1 + t * 0.045) + 0.040 * 5.1 * cos(s * 5.1 - t * 0.031 + seed * 0.7);
  float fold = 0.65 + 0.35 * smoothstep(0.05, 0.35, abs(slope));
  // 折り目: 幕が自分に折れ返る所は光が二重に重なって明るい。位置は幕ごとに seed で散らし、ゆっくり揺らす
  // 二乗は掛け算で書く (負の底の pow は GLSL で未定義になるため)
  float f1 = -0.55 + 1.1 * fract(seed * 0.618) + 0.03 * sin(t * 0.02);
  float f2 = -0.55 + 1.1 * fract(seed * 0.618 + 0.381) + 0.03 * cos(t * 0.017);
  float q1 = (s - f1) / 0.050;
  float q2 = (s - f2) / 0.040;
  float crease = exp(-q1 * q1) + 0.7 * exp(-q2 * q2);
  fold *= 1.0 + 1.6 * crease;

  // 筋: 細い筋・中くらいの筋・太い束の 3 段を混ぜ、同じ太さの柱が並ぶ「櫛」に見えないようにする。
  // 上へ行くほど筋をわずかに流し、垂れ下がる光の感じを出す
  float sl = s + up * 0.05;
  float r1 = vnoise(vec2(sl * 150.0 + seed * 5.0, up * 1.2 - t * 0.04));
  float r2 = vnoise(vec2(sl * 55.0 + seed * 11.0, up * 0.8 - t * 0.025));
  float r3 = vnoise(vec2(sl * 14.0 + seed * 3.0, t * 0.015));
  float rays = r1 * 0.30 + r2 * 0.45 + r3 * 0.25;
  // 筋は「ゲート」ではなく濃淡の変調にとどめる。本体は拡散した光で、そこに筋が乗る
  float streak = 0.35 + 0.65 * smoothstep(0.30, 0.80, rays);
  // 折り目の上では筋もくっきり出る
  streak = min(streak * (1.0 + 0.35 * crease), 1.4);
  // 筋ごとに高さを変える。光の柱の上端が揃うと人工的に見えるため
  // 縦長では筋を長く垂らし、縁の下の空の上 40% 近くまで光の筋を見せる (横長は従来どおり)
  float rayTop = (0.18 + 0.55 * smoothstep(0.2, 0.9, r2 * 0.6 + r3 * 0.4)) * (1.0 + 0.8 * pa);
  float vfade = exp(-up / rayTop * 1.6);

  // 区間ごとの明るさ (幕が途切れたり濃くなったりする)。時間でゆっくり流す
  float amp = smoothstep(0.12, 0.70, vnoise(vec2(s * 1.6 + seed * 2.7 + t * 0.010, seed)));
  // 幕全体の脈動はごく弱く、ゆっくり。加えて時々だけ、ふっと明るくなる波を重ねる
  // (gust は値が高い時間だけ立ち上がるので、常に明滅するより自然な「ときどき」になる)
  float pulse = 0.88 + 0.10 * sin(t * 0.17 + s * 1.3 + seed);
  float gust = smoothstep(0.62, 0.95, vnoise(vec2(t * 0.03 + seed * 7.3, seed * 1.9 + s * 0.3)));
  pulse *= 1.0 + 0.35 * gust;

  // 下端: 硬い線にせず、数 px ぼかした明るい縁にする
  float lower = smoothstep(-0.012, 0.010, d);
  float edgeGlow = exp(-up * 28.0);
  float green = strength * lower * amp * pulse * fold * (streak * vfade * 0.85 + edgeGlow * 0.9);

  // 赤 (630nm) は高い所ほど残る。筋の上の方だけに、ごく弱く
  float redI = strength * amp * streak * smoothstep(0.15, 0.45, up) * exp(-up * 2.2) * 0.28;
  // 縁の直下の紫は細い線ではなく、薄くにじむ光にする
  // 指数は負側だけで評価する。上側で exp が inf になり、inf * 0 で NaN (黒い線) が出るのを防ぐ
  float fringe = exp(min(d, 0.0) * 45.0) * (1.0 - lower) * strength * amp * 0.10;

  // 緑は蛍光に寄せず、青みのある緑にする (寒色の夜空と色温度を揃える)
  vec3 gC = vec3(0.18, 0.95, 0.66);
  vec3 rC = vec3(0.80, 0.18, 0.34);
  vec3 vC = vec3(0.42, 0.30, 0.95);
  // 幕の光は周りの空気も照らす。縁の下側にも緑の薄い光を回し、幕の下だけ暗い帯に見えるのを防ぐ
  float under = exp(min(d, 0.0) * 4.0) * (1.0 - lower) * strength * amp * 0.09 * smoothstep(-0.12, -0.04, d);
  return (gC * (green + under) + rC * redI + vC * fringe) * topFade;
}

// 幕は 2 本。主役は空の中ほどを横切る大きな幕、奥の幕は上に寄せて弱く
vec3 aurora(vec2 pn) {
  float aspect = uRes.x / uRes.y;
  float s = pn.x / max(aspect, 1.1);
  // 主役の幕は空の上半分を斜めに横切る (本文パネルの裏を明るくしすぎないよう、中央より上に置く)
  // 左端は少し持ち上げる。左上の題字の高さに幕の縁が来ると、白い文字の後ろで光が立つため
  // 縦長の画面では本文パネルが空の中央まで届くので、幕を画面の上へ持ち上げて
  // パネルの上に出す。横長では 0 なので従来の位置のまま (滑らかに変わる)
  float portrait = portraitAmt();
  float rise = 0.6 * portrait;
  // 主役の幕だけ縦長で下げ、縁の光が上の 3 割強まで届くようにする (下げた分は筋が長く垂れて補う)
  // 縦長の下げ幅は 0.30。0.36 だと縁が題字と本文パネルの上端の裏に来るため、少し持ち上げる
  float drop = 0.30 * portrait;
  float lift = 0.22 * smoothstep(-0.2, -1.0, s);
  // 縦長では左端の光を少し落とす。左上の題字の後ろで白い文字の対比が落ちないように
  float leftDim = 1.0 - 0.3 * portrait * smoothstep(-0.4, -0.9, s);
  vec3 au = curtain(pn, s, 0.42 + rise - drop + 0.12 * s - 0.10 * s * s + lift, 1.0, 1.5, portrait) * leftDim;
  au += curtain(pn, s, 0.86 + rise - 0.05 * s, 2.0, 0.50, portrait);
  return au;
}

// 天の川の帯の中心線からの距離 (帯に直交する座標 r.y)。帯の外では 0 に落ちる
vec2 milkyCoord(vec2 pn) {
  vec2 q = pn - vec2(0.15, 0.25);
  float ang = 0.55;
  return vec2(cos(ang) * q.x - sin(ang) * q.y, sin(ang) * q.x + cos(ang) * q.y);
}

// 天の川: 斜めの帯。中心は暖色、外側は青白く、塵の筋で暗く切れる
vec3 milkyWay(vec2 r, float bandR) {
  float lenFade = 0.45 + 0.55 * smoothstep(-1.4, 0.6, r.x) * (1.0 - smoothstep(0.9, 1.8, r.x));
  float cloud = fbm4(vec2(r.x * 5.0, r.y * 14.0) + vec2(3.7, 1.1));
  float dust = smoothstep(0.44, 0.64, fbm4(vec2(r.x * 7.0 + 4.0, r.y * 24.0)));
  vec3 mwCol = mix(vec3(0.50, 0.60, 0.95), vec3(1.0, 0.90, 0.74), bandR);
  float mwI = bandR * lenFade * (0.35 + 0.65 * cloud) * (1.0 - 0.8 * dust * bandR);
  return mwCol * mwI * 0.16;
}

// 空: 天頂は青黒、地平線の裏に薄い青緑の大気光。天の川と星を重ねる
vec3 sky(vec2 pn, vec2 px, float auLum) {
  float hY = 2.0 * HZ;
  float above = max(pn.y - hY, 0.0);
  float zen = clamp(above / (1.0 - hY), 0.0, 1.0);
  // 空は青黒。純黒でも灰色でもなく、天頂へ向けて藍から黒へ落とす
  vec3 col = mix(vec3(0.010, 0.026, 0.050), vec3(0.002, 0.005, 0.017), pow(zen, 0.5));
  // 地平線の大気光。山の裏から立ち上がる青緑の帯で、上へ速く消える
  // 減衰を緩めて、幕の下の空を暗いドームに見せない (大気光は上へもう少し広がる)
  col += vec3(0.024, 0.078, 0.104) * exp(-above * 3.2);

  // 天の川の帯の中心線からの距離。帯の外 (約 0.24 以上) は寄与が 0.2% 未満なので計算を省く
  vec2 mc = milkyCoord(pn);
  float band = exp(-mc.y * mc.y / (0.10 * 0.10));
  if (band > 0.004) col += milkyWay(mc, band);
  // 星は 3 層。天の川の帯では星が増える。オーロラの光があると見えにくくなる (実際の空と同じ)
  // 負の底の pow は GLSL で未定義 (NaN になり黒い点が出る) なので、二乗は掛け算で書く
  // セルの大きさは短辺基準にする。縦長で長辺基準だと星の数が面積に対して減って見えるため
  vec3 st = vec3(0.0);
  float cellU = min(uRes.x, uRes.y);
  st += starField(px, cellU * 0.0075, 0.07, uRes.y * 0.0009, 0.0, band);
  st += starField(px, cellU * 0.016, 0.025, uRes.y * 0.0013, 100.0, band);
  st += starField(px, cellU * 0.035, 0.010, uRes.y * 0.0019, 300.0, band);
  col += st * (1.0 - 0.75 * auLum);
  return col;
}

// 雪の被覆と岩の筋。山の相対高さ hu (水際=0, 峰=1) で雪線を決め、雪線をノイズで揺らす
// 縦の筋は x を細かく、y を粗くした 2 段のノイズで作る。上の方の雪を抜いて岩を見せる
float gully(float x, float y, float seed) {
  float v = vnoise(vec2(x * 110.0 + seed, y * 6.0 + seed * 0.5));
  float v2 = vnoise(vec2(x * 260.0 + seed * 2.0, y * 14.0 + seed));
  float g = 1.0 - abs(v * 2.0 - 1.0);
  float g2 = 1.0 - abs(v2 * 2.0 - 1.0);
  return clamp(smoothstep(0.80, 0.97, g) * 0.8 + smoothstep(0.86, 0.99, g2) * 0.4, 0.0, 1.0);
}

// 斜面が月側を向く度合い (0〜1)。sl の符号で切ると峰の頂点に縦の継ぎ目が出るため、
// 広い範囲の smoothstep で連続に変える (峰の両側が同じ色へ溶け合う)
float facingMoon(float sl) {
  return smoothstep(-1.2, 1.2, sl);
}

// 山脈 3 層 + 手前の丘。陰影と雪を付ける。
// 水面の鏡像もこの関数をそのまま使うので、水際で稜線が必ず一致する
// auLum は幕の明るさ。雪が幕の光を受けて緑がかる量に使う
vec3 mountains(vec2 p, vec3 col, float auLum) {
  float aa = 1.5 / min(uRes.x, uRes.y);
  float e = 0.012;
  // 最も高い峰 (HZ + 0.26) より上は全層のマスクが 0 になる。ノイズを計算せずに抜ける
  // (aa は 1.5px 分の余裕。小さい画面でも峰の縁を切らないため、判定の境界に含める)
  if (p.y > HZ + 0.26 + aa) return col;

  // 奥の山: 雪の massif。山の上 60% に雪、月側は淡い青白、影側は青灰。
  // 雪線は近くの峰の高さ (±0.04 の最大) を基準にし、峰ごとに高さが合うようにする
  // 峰より上の画素は陰影を計算しても混ぜ率が 0 なので、先に稜線の高さだけで判定して省く
  {
    float x = p.x + uPointer.x * 0.004;
    float h = ridgeFar(x);
    if (p.y < h + aa) {
      float sl = (ridgeFar(x + e) - ridgeFar(x - e)) / (2.0 * e);
      float top = max(h, max(ridgeFar(x - 0.04), ridgeFar(x + 0.04)));
      float hu = (p.y - HZ) / max(top - HZ, 0.02);
      float fac = facingMoon(sl);
      float line = 0.40 + 0.08 * (vnoise(vec2(x * 9.0, 3.0)) - 0.5);
      float sn = smoothstep(line - 0.05, line + 0.05, hu);
      // 雪が抜けて岩の筋が見える。低い所ほど筋が多い (風の当たりにくい雪が少ない所)
      // 岩の筋は半分の強さに抑える。濃い曲がった筋だと雪山が木目のように見えるため
      float rockG = gully(x, p.y, 3.0) * mix(0.45, 1.0, 1.0 - clamp(hu, 0.0, 1.0));
      sn *= 1.0 - 0.5 * rockG;
      vec3 rock = vec3(0.050, 0.064, 0.098) * (0.55 + 0.6 * fac);
      // 雪面の起伏を低い周波数の濃淡で出し、一様な白い帯に見せない
      float lump = 0.82 + 0.36 * vnoise(vec2(x * 30.0 + 1.7, p.y * 12.0));
      // 雪は青白く、わずかに緑を含ませる。紫がかると夜の雪が冷たさを失うため
      vec3 snowC = mix(vec3(0.14, 0.21, 0.31), vec3(0.34, 0.45, 0.58), fac) * lump;
      // オーロラの光を受けた雪は緑がかる (反射光なので弱く、青白さを残す)
      snowC += vec3(0.02, 0.12, 0.09) * smoothstep(0.0, 0.3, auLum);
      vec3 c = mix(rock, snowC, sn);
      c = mix(c, HAZE_FAR, 0.15);
      col = mix(col, c, 1.0 - smoothstep(-aa, aa, p.y - h));
    }
  }

  // 根元の霧: 奥の山の水際の少し上に薄い帯を敷き、層の境目をぼかす
  {
    float above = max(p.y - HZ, 0.0);
    float band = exp(-above * 38.0);
    float drift = 0.55 + 0.45 * vnoise(vec2(p.x * 4.0 + uTime * 0.03, p.y * 30.0));
    col += vec3(0.07, 0.10, 0.13) * band * drift * 0.9;
  }

  // 中の山: 岩が主で、峰の上にだけ雪の斑点。奥より暗く、影は濃い
  // 中の山の最高点は HZ + 0.125 なので、それより上では計算しない
  if (p.y < HZ + 0.125 + aa) {
    float x = p.x + uPointer.x * 0.010;
    float h = ridgeMid(x);
    if (p.y < h + aa) {
      float sl = (ridgeMid(x + e) - ridgeMid(x - e)) / (2.0 * e);
      float fac = facingMoon(sl);
      float hu = (p.y - HZ) / max(h - HZ, 0.02);
      float snowPatch = 0.45 + 0.55 * vnoise(vec2(x * 40.0, 6.0));
      float sn = smoothstep(0.80, 0.92, hu) * fac * snowPatch * 0.85;
      vec3 rock = vec3(0.018, 0.024, 0.040) * (0.5 + 0.6 * fac);
      vec3 snowC = vec3(0.14, 0.19, 0.29) * (0.6 + 0.5 * fac);
      vec3 c = mix(rock, snowC, sn);
      c = mix(c, HAZE_MID, 0.14);
      col = mix(col, c, 1.0 - smoothstep(-aa, aa, p.y - h));
    }
  }

  // 手前の丘: ほぼ黒いシルエット。月側の縁にだけ細い月明かり
  // 最高点は HZ + 0.075。月明かりは縁から 0.03 以上離れると無視できる量になる
  if (p.y < HZ + 0.11) {
    float x = p.x + uPointer.x * 0.020;
    float h = ridgeNear(x);
    if (p.y < h + 0.03) {
      float sl = (ridgeNear(x + e) - ridgeNear(x - e)) / (2.0 * e);
      float m = 1.0 - smoothstep(-aa, aa, p.y - h);
      float above = max(p.y - h, 0.0);
      float rim = exp(-above / 0.0045) * facingMoon(sl) * (1.0 - m);
      col = mix(col, vec3(0.006, 0.009, 0.016), m);
      col += vec3(0.12, 0.17, 0.22) * rim * 0.5;
    }
  }
  return col;
}

// 水平線より上の全景。空・オーロラ・月・山を重ねる。
// 水面の鏡像もこの関数を通すので、映り込みは水際を境に正確に裏返しになる
// auK は幕の明るさの倍率。水面の映り込みだけ弱くするために使う
vec3 scene(vec2 p, vec2 px, float auK) {
  // 視差は横方向だけに掛ける。縦に掛けると鏡像の軸がずれて水際で合わなくなるため。
  // 量は奥の山 (0.004) より小さくし、空 < 遠山 < 中山 < 手前の順に動くようにする
  vec2 pn = p * 2.0 + vec2(uPointer.x * 0.004, 0.0);
  vec3 au = aurora(pn) * auK;
  float auLum = clamp(dot(au, vec3(0.33)) * 1.2, 0.0, 1.0);
  vec3 col = sky(pn, px, auLum) + au;
  // 月は空と同じ層なので、同じ向きに同じ量だけずらす
  vec4 moon = moonLayer(p + vec2(uPointer.x * 0.002, 0.0));
  col = col * (1.0 - moon.w) + moon.xyz;
  return mountains(p, col, auLum);
}

// 湖: 水際を境に全景を上下反転して映す。暗く落とし、手前ほど横に大きく揺らす
// fc は描画中の画素座標 (gl_FragCoord)。星の位置を水際で裏返した座標で引き、映り込みの星を実際の星の位置に合わせる
vec3 lake(vec2 p, vec2 fc, float bottomY) {
  float depth = HZ - p.y;
  float t = uTime;
  // 波の横揺れ。振幅は水際で 0、画面下端で数 px になるように深さに比例させる
  float z = 1.0 / (depth + 0.12);
  float rx = (vnoise(vec2(p.x * 16.0 * z, z * 2.5 + t * 0.10)) - 0.5) * 0.024 * depth;
  // 鏡像: 水平線 HZ を軸に縦だけ裏返す。x は揺れ分だけずらす
  vec2 q = vec2(p.x + rx, 2.0 * HZ - p.y);
  // 水面の波で映り込みの幕が縦に細く揺れる。空の幕より少し暗くするのは、水面が光を散らすため
  float streak = vnoise(vec2(p.x * 140.0, z * 0.6 + t * 0.05));
  // 鏡像の星: 空に星が無いと映り込みが一様な灰色の塊に見えるため、星も裏返して映す。
  // 水際の裏返しは画素座標でも同じ軸 (waterline の y) で行う
  float H = min(uRes.x, uRes.y);
  float yW = HZ * H + 0.5 * uRes.y;
  vec2 pxM = vec2(fc.x, 2.0 * yW - fc.y);
  vec3 mirror = scene(q, pxM, 0.8 * (0.85 + 0.3 * streak));

  // 水面の反射率。浅い角度ほど少し強く映る
  vec3 col = vec3(0.006, 0.011, 0.020) + mirror * (0.55 + 0.08 * exp(-depth * 3.0));

  // 月の光の道: 月の真下へ細く伸びる。ゆっくり揺れる小さなきらめき
  vec2 mp = moonPos();
  float pathW = 0.03 + depth * 0.18;
  float px = (p.x - mp.x) / pathW;
  float path = exp(-px * px);
  float glint = pow(vnoise(vec2(p.x * 260.0 * z, z * 6.0 + t * 0.25)), 10.0);
  col += vec3(0.80, 0.86, 1.0) * glint * path * 0.20;

  // 水際の靄
  col += vec3(0.04, 0.07, 0.09) * exp(-abs(p.y - HZ) * 40.0) * 0.4;

  // 最下端の薄い棚氷。ひびの模様は入れず、ざらつきだけの帯にする
  float top = bottomY + 0.045 + 0.012 * (vnoise(vec2(p.x * 6.0, 2.0)) - 0.5);
  float ice = 1.0 - smoothstep(top - 0.003, top + 0.003, p.y);
  // 氷は水際ほど白っぽく、外へ向かって暗く溶けていく
  vec3 iceC = mix(vec3(0.20, 0.27, 0.34), vec3(0.11, 0.15, 0.20), clamp((top - p.y) / 0.04, 0.0, 1.0));
  iceC *= 0.90 + 0.10 * vnoise(vec2(p.x * 12.0, p.y * 60.0));
  col = mix(col, iceC, ice);
  return col;
}

// 色調カーブ。輝度に 1 - exp を掛けて明るさだけを丸め、色比は保つ。
// その後チャンネルごとに 0.8 から先を緩やかに丸め、1.0 で飽和させない (平坦な白や緑の塊を出さない)。
// 高輝度ほど緑を少し白へ寄せ、蛍光色にならないようにする
vec3 grade(vec3 c) {
  float L = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float Lm = 1.0 - exp(-L * 1.45);
  c *= Lm / max(L, 1e-4);
  c = mix(c, vec3(Lm), smoothstep(0.45, 1.0, Lm) * 0.22);
  vec3 over = max(c - 0.8, 0.0);
  c = min(c, vec3(0.8)) + 0.2 * (1.0 - exp(-over / 0.2));
  return c;
}

void main() {
  float H = min(uRes.x, uRes.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / H;
  // 画面の下端の y (p 座標)。画面比によって変わるので毎回求める
  float bottomY = -0.5 * uRes.y / H;
  vec3 col = p.y >= HZ ? scene(p, gl_FragCoord.xy, 1.0) : lake(p, gl_FragCoord.xy, bottomY);
  // 色調: 輝度で明るさだけを丸め、色味は保つ (チャンネルごとに丸めると緑が先に飽和して平坦になる)
  col = grade(col);
  // 周辺減光は弱く。画面の端を少し落として視線を中央の幕へ寄せる
  vec2 uv = gl_FragCoord.xy / uRes - 0.5;
  col *= 1.0 - 0.30 * dot(uv, uv) * 1.4;
  // 量子化による帯を消すためのディザ
  col += (hash21(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`

// 雪は小さな粒を大半にし、ぼけた玉ボケを数個だけ。粒が多いと全面がノイズに見えるため
const SNOW_VERT = /* glsl */ `
attribute float aSpeed;
attribute float aSize;
attribute float aBlur;
attribute float aAlpha;
attribute float aPhase;
uniform float uTime;
uniform vec2 uRes;
varying float vAlpha;
varying float vBlur;

void main() {
  // 落下は画面座標で行い、y は fract で周回させる。端では透明にして継ぎ目を隠す
  float fy = fract(position.y + uTime * aSpeed);
  // 縦長の画面は同じ粒数だと密に見えるので、一部の粒を消して面積あたりの量を揃える
  float keep = step(aPhase / 6.2831853, clamp(0.35 + 0.65 * uRes.x / uRes.y, 0.0, 1.0));
  // 横の揺れは小さく、ゆっくり
  float fx = position.x + 0.012 * sin(uTime * 0.25 + aPhase);
  gl_Position = vec4(fx * 2.0 - 1.0, 1.0 - fy * 2.0, 0.0, 1.0);
  // 粒の大きさは 720p 基準。画面の解像度が変わっても雪の見え方を揃える
  gl_PointSize = aSize * uRes.y / 720.0;
  vAlpha = keep * aAlpha * smoothstep(0.0, 0.08, fy) * (1.0 - smoothstep(0.92, 1.0, fy));
  vBlur = aBlur;
}
`

const SNOW_FRAG = /* glsl */ `
varying float vAlpha;
varying float vBlur;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  // 焦点の合った雪は輪郭が締まり、ぼけた雪は縁へ緩く減衰する玉ボケになる
  float sharp = 1.0 - smoothstep(0.6, 1.0, d);
  float bokeh = (1.0 - smoothstep(0.2, 1.0, d)) * (1.0 - smoothstep(0.2, 1.0, d));
  float a = mix(sharp, bokeh, vBlur) * vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vec3(0.86, 0.93, 1.0), a);
}
`

// 再現可能な乱数 (mulberry32)。Math.random は描画中に使えないため
function mulberry32(seed: number) {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 玉ボケは最初の数粒だけ。残りは小さな焦点の粒にする
const BOKEH_COUNT = 5

function buildSnow(): THREE.BufferGeometry {
  const rand = mulberry32(20261008)
  const count = 250
  const position = new Float32Array(count * 3)
  const speed = new Float32Array(count)
  const size = new Float32Array(count)
  const blur = new Float32Array(count)
  const alpha = new Float32Array(count)
  const phase = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const bokeh = i < BOKEH_COUNT
    position[i * 3] = rand()
    position[i * 3 + 1] = rand()
    // 落下は画面高さに対する割合。遅めにして、雪が漂うように見せる (720p で約 9〜22px/s)
    speed[i] = bokeh ? 0.01 + rand() * 0.008 : 0.012 + rand() * 0.018
    // 大半は 1 px 前後の粒。玉ボケは近いものとして大きく、ごく薄く
    size[i] = bokeh ? 28 + rand() * 12 : 1.0 + rand() * 1.4
    blur[i] = bokeh ? 1 : 0
    alpha[i] = bokeh ? 0.05 + rand() * 0.03 : 0.18 + rand() * 0.4
    phase[i] = rand() * Math.PI * 2
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3))
  geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1))
  geometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1))
  geometry.setAttribute("aBlur", new THREE.BufferAttribute(blur, 1))
  geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1))
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1))
  return geometry
}

// 材質ごとに uniform を別々に持つ。雪は時間と解像度だけ使うので、空の uPointer は渡さない
type SnowUniforms = {
  uTime: THREE.IUniform<number>
  uRes: THREE.IUniform<THREE.Vector2>
}
type SkyUniforms = SnowUniforms & {
  uPointer: THREE.IUniform<THREE.Vector2>
}

export function AuroraTheme() {
  const skyUniforms = useMemo<SkyUniforms>(
    () => ({
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2() },
    }),
    [],
  )
  const snowUniforms = useMemo<SnowUniforms>(
    () => ({
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
    }),
    [],
  )
  const snowGeometry = useMemo(() => buildSnow(), [])
  // 更新は材質の ref 経由で行う。useMemo の値を直接書き換えると React Compiler の lint に引っかかる。
  // R3F は uniforms を材質ごとにコピーするため、雪の時間も雪の材質の ref から書かないと止まったままになる
  const skyMatRef = useRef<THREE.ShaderMaterial>(null)
  const snowMatRef = useRef<THREE.ShaderMaterial>(null)

  useFrame((state, delta) => {
    const sky = skyMatRef.current
    const snow = snowMatRef.current
    if (!sky || !snow) return
    const skyU = sky.uniforms as SkyUniforms
    const snowU = snow.uniforms as SnowUniforms
    const t = state.clock.elapsedTime
    // 描画バッファの実ピクセル数で合わせる (dpr を掛ける)。雪と空で同じ値を使う
    const width = state.size.width * state.viewport.dpr
    const height = state.size.height * state.viewport.dpr
    skyU.uTime.value = t
    skyU.uRes.value.set(width, height)
    snowU.uTime.value = t
    snowU.uRes.value.set(width, height)
    // 視差は指の動きに追従しすぎないよう、時間基準の lerp でゆっくり寄せる
    skyU.uPointer.value.lerp(state.pointer, 1 - Math.exp(-delta * 1.2))
  })

  return (
    <>
      <color attach="background" args={["#02040a"]} />
      <mesh frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={skyMatRef}
          vertexShader={SKY_VERT}
          fragmentShader={SKY_FRAG}
          uniforms={skyUniforms}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      <points geometry={snowGeometry} frustumCulled={false} renderOrder={1}>
        <shaderMaterial
          ref={snowMatRef}
          vertexShader={SNOW_VERT}
          fragmentShader={SNOW_FRAG}
          uniforms={snowUniforms}
          transparent
          depthWrite={false}
        />
      </points>
    </>
  )
}
