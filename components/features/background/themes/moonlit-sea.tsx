"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

// 月夜の海。全画面の 1 枚のシェーダーで空と海を描く。
// 海面の反射に同じ空の関数を使うので、月の映り込みと光の道が物理的につながる。
const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  // カメラに依存させず画面全体を覆う (NDC 直書き)
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uAspect;
uniform float uPixel;
uniform vec2 uPointer;
// 地平線の画面 y 座標と月の半径。縦長の画面では地平線を上げ、月を少し小さくする (aspect で決める)
uniform float uHorizon;
uniform float uMoonR;
// きらめきの格子数 (画面の高さ 1 単位あたり)。画面の高さ CSS px に比例させる
uniform float uSparkCells;
varying vec2 vUv;

// 画面座標 p の単位は画面の高さ。焦点距離 FOCAL で視線方向と対応づける
const float FOCAL = 1.5;
// 月の位置 (x は uAspect を掛けて画面端からの位置を保つ)
const float MOON_X = 0.26;
const float MOON_Y = 0.22;
// 月の白。少しだけ暖色にして、青い空の中で浮いて見えないようにする
const vec3 MOON_TINT = vec3(1.0, 0.972, 0.915);
// 水と雲の縁に乗る銀色。月の白に少しだけ青緑を足し、夜の冷たい色調をそろえる
const vec3 SILVER = vec3(0.80, 0.94, 1.0);
// 黒の底。純黒にせず紺色を残す (純黒は画面が切れて見え、灰色の霞は画面を白く濁らせる)
const vec3 NAVY_FLOOR = vec3(0.004, 0.008, 0.018);
// 遠い海の霞の色。空の地平線付近より暗くして、水と空の境目をはっきりさせる
const vec3 HAZE_SEA = vec3(0.030, 0.042, 0.054);
// マウス追従の量 (画面の高さに対する割合)。遠い層ほど小さく、空 < 遠い島 < 岬 < 手前の海 の順に動かす。
// 奥ほど動きが小さいのは、視差として自然に見せるため (全層が同じ速さだと板が滑って見える)
const float PAR_SKY = 0.004;
const float PAR_FAR = 0.007;
const float PAR_LAND = 0.010;
// 海は波の位置を世界座標でずらす (画面座標でずらすと、月の光の道が月からずれる)
const float PAR_SEA = 0.040;

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

// オクターブは 5 まで (予算内)
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s;
}

// 遠景の濃淡用の低オクターブ fbm (3 段)。海の遠くは細部が霞で潰れるため、細かい段を省く
float fbmLow(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s;
}

// 3D のノイズ。月面は球の法線から引く (2D を円盤に貼ると、縁で模様が引き伸ばされるため)
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 rnd3(vec3 p) {
  return vec3(hash13(p), hash13(p + vec3(17.1, 3.7, 9.2)), hash13(p + vec3(5.3, 21.9, 1.3)));
}

float vnoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float x0 = mix(
    mix(hash13(i), hash13(i + vec3(1.0, 0.0, 0.0)), u.x),
    mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), u.x), u.y);
  float x1 = mix(
    mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), u.x),
    mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), u.x), u.y);
  return mix(x0, x1, u.z);
}

float fbm3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise3(p);
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return v;
}

// クレーターの縁と底を作るセル距離 (F1)
float worley3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  float d = 1.0;
  for (int z = -1; z <= 1; z++) {
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec3 g = vec3(float(x), float(y), float(z));
        vec3 r = g + rnd3(i + g) - f;
        d = min(d, dot(r, r));
      }
    }
  }
  return sqrt(d);
}

// 月面。lp は月の中心からの位置を半径 1 で割ったもの
vec3 moonSurface(vec2 lp) {
  float mu = sqrt(max(1.0 - dot(lp, lp), 0.0));
  vec3 n = vec3(lp, mu);
  // 向きは画面に対する法線のまま使う。先に回すと縁の減光の位置がずれる
  n.xz = mat2(0.82, -0.57, 0.57, 0.82) * n.xz;

  // 大きな海 (マリア) は低周波の fbm で濃淡を作る
  float mare = fbm3(n * 1.3 + vec3(2.7, 0.4, 5.1));
  float maria = smoothstep(0.50, 0.60, mare);
  float hi = fbm3(n * 4.0 + 13.0);
  float alb = mix(0.80 + 0.10 * (hi - 0.5), 0.40 + 0.08 * (hi - 0.5), maria);

  // クレーターは縁を明るく、底を暗くして凹凸を出す
  float w1 = worley3(n * 7.5 + 1.7);
  float w2 = worley3(n * 19.0 + 4.3);
  alb += 0.12 * smoothstep(0.10, 0.16, w1) * (1.0 - smoothstep(0.16, 0.24, w1));
  alb -= 0.14 * (1.0 - smoothstep(0.0, 0.10, w1));
  alb += 0.05 * smoothstep(0.08, 0.12, w2) * (1.0 - smoothstep(0.12, 0.18, w2));
  // 細かい粒状の起伏。遠目には見えないが、月面の質感を出す
  alb += 0.07 * (vnoise3(n * 42.0) - 0.5);

  // 太陽は正面寄りなので、わずかに斜めから当てて凹凸を見せる
  float lam = clamp(dot(n, normalize(vec3(-0.32, 0.30, 0.90))), 0.0, 1.0);
  float shade = mix(0.84, 1.0, lam * 0.5 + 0.5 * mu);
  // 周縁減光。縁は中心より暗くなり、球としての立体感を出す (縁の輪郭は消えない程度)
  float limb = 0.38 + 0.62 * pow(max(mu, 0.0), 0.55);
  // 露出は後段のトーンカーブで抑えられるので、ここで強めに持ち上げて近白にする。
  // マリアは暗いまま残り、クレーターの縁が白く立つ
  // 2.2 だと白に飽和して平らな円盤になり、マリアが消えるため少し下げる
  return alb * shade * limb * MOON_TINT * 1.9;
}

// 雲の濃さ (0..1)。横に長く伸ばした fbm を高度の帯で切り、途切れた層雲と高積雲にする。
// 歪ませると渦になるので、座標は歪ませずに引き伸ばすだけにする
float cloudDens(vec2 q) {
  float t = uTime;
  float h = q.y - uHorizon;
  // 各層は帯の外で必ず 0 になる。帯の外では fbm を計算しない (結果は同じで、雲の評価回数を減らす)
  float dA = 0.0;
  float dB = 0.0;
  float dC = 0.0;
  // 月のすぐ下を通る層雲の帯。月の高さ (h≈0.30) の下側に横切る
  if (h > 0.10 && h < 0.31) {
    float bandA = smoothstep(0.10, 0.16, h) * (1.0 - smoothstep(0.24, 0.31, h));
    float nA = fbm(vec2(q.x * 0.8 + t * 0.010, q.y * 9.0));
    // 縦長では同じ雲の密度が幅の狭い画面で全幅を覆ってしまうため、しきい値を少し上げて切れ間を作る
    float thin = 0.05 * (1.0 - smoothstep(0.5, 1.0, uAspect));
    dA = smoothstep(0.50 + thin, 0.63 + thin, nA) * bandA;
  }
  // 地平線近くの薄い層雲。低く細く、帯として見える程度に
  if (h > 0.02 && h < 0.15) {
    float bandB = smoothstep(0.02, 0.06, h) * (1.0 - smoothstep(0.10, 0.15, h));
    float nB = fbm(vec2(q.x * 1.1 - t * 0.008 + 4.0, q.y * 11.0));
    dB = smoothstep(0.54, 0.68, nB) * bandB * 0.85;
  }
  // 高いところの巻雲のすじ。右寄りだけに出し、左上の空は星のために空けておく
  if (h > 0.34 && h < 0.48) {
    float bandC = smoothstep(0.34, 0.40, h) * (1.0 - smoothstep(0.42, 0.48, h));
    float envC = smoothstep(-0.25, 0.45, q.x);
    float nC = fbm(vec2(q.x * 1.4 + t * 0.006 + 11.3, q.y * 16.0 + 3.1));
    dC = smoothstep(0.62, 0.74, nC) * bandC * envC * 0.6;
  }
  return max(dA, max(dB, dC));
}

// 空の色。detail が偽のときは海の反射用に星と巻雲を省く
vec3 sky(vec3 dir, bool detail) {
  float dz = min(dir.z, -0.02);
  // 視線方向を画面座標へ戻す (海の反射のとき、ここで月の位置と一致する)
  vec2 q = dir.xy * FOCAL / (-dz) + vec2(0.0, uHorizon) + uPointer * PAR_SKY;
  float h = q.y - uHorizon;

  // 大気の勾配: 地平線付近ほど霞んで明るい
  vec3 zen = vec3(0.008, 0.015, 0.032);
  vec3 mid = vec3(0.022, 0.040, 0.070);
  // 地平線の霞は灰色にせず青緑寄りにして、夜の色調を海と揃える
  vec3 hor = vec3(0.084, 0.114, 0.142);
  vec3 col = mix(hor, mid, smoothstep(0.0, 0.14, h));
  col = mix(col, zen, smoothstep(0.14, 0.55, h));
  // 地平線の上の霞は、帯の端が見えないよう広めにゆるく減衰させる
  col += vec3(0.030, 0.040, 0.048) * exp(-max(h, 0.0) * 9.0);
  // 月明かりの霞: 地平線のすぐ上だけ、青みのある薄い明るい帯を足す。天頂は深いまま
  col += vec3(0.016, 0.024, 0.032) * exp(-max(h, 0.0) * 26.0);

  vec2 mq = vec2(MOON_X * uAspect, MOON_Y);
  float dm = length(q - mq);

  if (detail) {
    // 星: 2 段のセルに置く。大きい星は少なく、小さい星は多く。どちらも一部だけをまたたかせる。
    // 星は雲の下に描き、雲の mix で隠れるようにする (雲の前に星が出ないように)
    for (int layer = 0; layer < 2; layer++) {
      float cellScale = layer == 0 ? 90.0 : 170.0;
      float thr = layer == 0 ? 0.90 : 0.96;
      vec2 sp = q * cellScale + float(layer) * 31.7;
      vec2 id = floor(sp);
      vec2 f = fract(sp) - 0.5;
      float rnd = hash12(id);
      if (rnd > thr && h > 0.04) {
        vec2 off = vec2(hash12(id + 7.1), hash12(id + 3.7)) - 0.5;
        float s = smoothstep(0.16, 0.0, length(f - off * 0.6));
        // またたきはゆっくり (周期 4〜12 秒)。速いと点滅に見えて落ち着かない
        float tw = 0.7 + 0.3 * sin(uTime * (0.5 + rnd * 1.2) + rnd * 60.0);
        float bright = (rnd - thr) / (1.0 - thr);
        col += vec3(0.75, 0.82, 1.0) * s * bright * (layer == 0 ? 4.5 : 2.5) * tw * 0.7
               * smoothstep(0.04, 0.3, h) * (1.0 - exp(-dm * 6.0));
      }
    }
  }

  // 月の光輪 (大気中の散乱)。円盤の縁の近くで強く、急に落ちる。遠くには長く薄く残る
  float dr = max(dm - uMoonR, 0.0);
  float aura = exp(-dr * 38.0) * 0.45 + exp(-dr * 11.0) * 0.07;
  col += MOON_TINT * aura;

  // 22 度ハロ相当の淡い光輪。実物は白っぽく、内側のごく細い縁だけがほのかに赤い。
  // 彩度を落として、赤が面で見えないようにする
  float ringR = 0.30;
  // 幅を少し広げ、濃さを下げる。細すぎると線で描いた円に見えるため
  float ring = exp(-pow(dm - ringR, 2.0) * 1400.0) * 0.026;
  vec3 ringCol = mix(vec3(1.0, 0.86, 0.82), vec3(0.92, 0.95, 1.0), smoothstep(ringR - 0.01, ringR + 0.01, dm));
  col += ringCol * ring;

  // 月の円盤。月面は法線から作る (moonSurface)
  float disc = smoothstep(uMoonR, uMoonR * 0.985, dm);
  if (disc > 0.0) {
    col = mix(col, moonSurface((q - mq) / uMoonR), disc);
  }

  if (detail) {
    float dens = cloudDens(q);
    if (dens > 0.001) {
      // 月の方向へずらして濃さを比べる。月側の縁だけ差が出るので、そこが銀色の縁になる
      vec2 toMoon = normalize(mq - q + vec2(1e-5));
      float dT = cloudDens(q + toMoon * 0.02);
      float silver = clamp((dens - dT) * 3.0, 0.0, 1.0);
      // 下にまだ雲があれば雲の底。底は暗く、上面は月明かりでわずかに明るい
      float dU = cloudDens(q + vec2(0.0, 0.02));
      float under = clamp((dU - dens) * 2.5, 0.0, 1.0);
      // 月の光輪が雲の上面を照らす。近い雲ほど明るく、光輪と同じ急な減衰に従う
      vec3 topCol = vec3(0.105, 0.124, 0.152);
      vec3 baseCol = vec3(0.040, 0.050, 0.066);
      vec3 cloudCol = mix(topCol, baseCol, under) + SILVER * silver * (0.20 + 0.45 * exp(-dm * 2.5));
      cloudCol += MOON_TINT * aura * 0.9 * (1.0 - under);
      // 月の円盤の上は薄い部分だけ通すので、月がうっすら透けて見える
      float cover = dens * 0.85 * (1.0 - 0.45 * disc);
      col = mix(col, cloudCol, cover);
    }
  }

  return col;
}

// 岬と灯台 (地平線の左側)。シルエットは暗い青灰色で、空の反射にも同じ形で出る
// 左からゆるく上がり、灯台のある頂き (ux≈0.55) で最も高く、右側は海へ切り立つ断崖になる
float landTop(float nx) {
  float ux = (nx + 0.5) / 0.30;
  float rise = smoothstep(0.02, 0.55, ux);
  float drop = 1.0 - smoothstep(0.62, 0.74, ux);
  float body = rise * drop;
  // 稜線の小さな凹凸。平たい塊に見せないための低めの揺らぎ
  float rough = 0.006 * (vnoise(vec2(nx * 70.0, 2.0)) - 0.5) * body;
  // 頂きの木立。細かいノイズを尖らせた小さな突起だけを、高い所にだけ出す
  float trees = pow(vnoise(vec2(nx * 180.0, 5.0)), 3.0) * 0.016 * smoothstep(0.6, 0.95, body);
  // 縦長の画面では岬の幅 (画面幅の 30%) に対して高すぎて針のように見えるため、高さを抑える
  float hs = mix(0.55, 1.0, smoothstep(0.4, 1.6, uAspect));
  // 両端は海面まで下がって消える (端で切れると不自然な段になる)
  return hs * (0.062 * body + rough + trees + 0.003 * vnoise(vec2(nx * 60.0, 1.0)) * smoothstep(0.0, 0.1, ux) * body);
}

// 遠くの小さな島 (右側、地平線のすぐ上)。霞に溶けて、ほとんど輪郭だけが残る
float farIslandTop(float nx) {
  float u = (nx - 0.30) / 0.16;
  float body = smoothstep(0.0, 0.3, u) * (1.0 - smoothstep(0.7, 1.0, u));
  return 0.011 * body * (0.6 + 0.4 * vnoise(vec2(nx * 120.0, 3.0)));
}

// 各波の進行方向と位相。毎ピクセル乱数で求めず、同じ並びを定数で持つ (見た目は変えない)
const vec2 WAVE_DIR[9] = vec2[9](
  vec2(-0.625600, 0.780144), vec2(-0.209131, 0.977888), vec2(-0.591663, 0.806186),
  vec2(-0.162462, 0.986715), vec2(-0.227532, 0.973771), vec2(-0.620618, 0.784113),
  vec2(0.267536, 0.963548), vec2(-0.446758, 0.894655), vec2(0.448582, 0.893742)
);
const float WAVE_PH[9] = float[9](
  0.000000, 2.069523, 6.148967, 5.121742, 0.891325, 2.655291, 2.523450, 5.445740, 1.405399
);

// 海面の傾き (xy) と高さ (z)。進行波を 9 本重ね、画面の 1px より細かい波は振幅を落とす
// 高さは傾きの積分なので、傾き = 高さの微分 がつねに成り立つ (波頭の判定に使う)
vec3 seaSlope(vec2 x, float dist) {
  vec3 g = vec3(0.0);
  // 世界 1 単位が何デバイスピクセルになるか (遠いほど小さい)
  float pxPerUnit = FOCAL / (dist * uPixel);
  // 手前の波は透視で大きく見えるので振幅を増し、遠くの海は穏やかなままにする
  float near = mix(0.65, 1.35, smoothstep(12.0, 3.0, dist));
  // 波長は 0.70 倍、振幅は 0.78 倍ずつ減る。pow ではなく掛け算で持つ
  float lam = 3.4;
  float s = 0.075 * near;
  for (int i = 0; i < 9; i++) {
    // 画面 1px の 2.5 倍未満の波は fade が 0 になり、以降の短い波もすべて 0 になるので打ち切る
    float px = lam * pxPerUnit;
    if (px <= 2.5) break;
    float k = 6.2831853 / lam;
    float fade = smoothstep(2.5, 6.0, px);
    // 進行速度は分散式 (sqrt(g k)) に 0.25 を掛けて遅くする。短い波ほど速いので、
    // 掛け率を下げて、細かい波が 1 Hz 近くで揺れないようにする
    float ph = dot(WAVE_DIR[i], x) * k + uTime * sqrt(9.8 * k) * 0.25 + WAVE_PH[i];
    g.xy += WAVE_DIR[i] * s * cos(ph) * fade;
    g.z += (s / k) * sin(ph) * fade;
    lam *= 0.70;
    s *= 0.78;
  }
  return g;
}

vec3 seaColor(vec2 p) {
  // 水面 (y=0) とカメラ (高さ 1) の交点を求め、世界座標の波を引く
  vec3 d = normalize(vec3(p.x, p.y - uHorizon, -FOCAL));
  float t = -1.0 / d.y;
  vec3 P = vec3(t * d.x, 0.0, t * d.z);
  // 波の位置だけを手前ほど大きくずらす (視差)。反射の向き d は動かさないので、光の道は月に留まる
  vec2 W = P.xz - uPointer * PAR_SEA;
  float Z = -P.z;

  // 波の傾き。遠くの波は 1px 未満になるので消す (モアレ防止)
  vec3 SH = seaSlope(W, Z);
  vec2 S = SH.xy;
  vec3 n = normalize(vec3(-S.x, 1.0, -S.y));

  // 反射と水の下の色。斜めに見るほどフレネルで空が強く映る
  vec3 r = reflect(d, n);
  float cosV = clamp(-dot(d, n), 0.0, 1.0);
  float F = 0.02 + 0.98 * pow(1.0 - cosV, 5.0);
  // 水面より下へ反射したときは黒にせず暗い水色へ滑らかにつなぐ (黒い帯が出るのを防ぐ)
  vec3 deep = vec3(0.005, 0.018, 0.030);
  vec3 skyRefl = sky(normalize(vec3(r.x, r.y, min(r.z, -0.05))), false);
  vec3 refl = mix(deep * 2.0, skyRefl, smoothstep(-0.03, 0.03, r.y));
  vec3 col = deep * (1.0 - F) + refl * F;

  // 月の光の道: 反射方向が月に近い面だけ光らせる
  // 月の向きは空の関数と同じ視差量でずらす。空側の月がマウスで動いても、映り込みと光の道が一致する
  vec2 offS = uPointer * PAR_SKY;
  vec3 M = normalize(vec3(MOON_X * uAspect - offS.x, MOON_Y - uHorizon - offS.y, -FOCAL));
  float rm = max(dot(r, M), 0.0);
  // 連続した光の帯。広い lobe で、月の真下の列を地平線から手前まで途切れなく照らす
  col += SILVER * pow(rm, 40.0) * 0.24 * (1.0 - F * 0.5);
  // 波頭の淡い照り: 高い所 (波頭) だけ、光の道の近くで月明かりを少し拾う。泡は描かない
  float crest = smoothstep(0.012, 0.040, SH.z);
  col += vec3(0.80, 0.86, 0.95) * crest * pow(rm, 6.0) * 0.045 * (1.0 - F * 0.5);
  // きらめき: 細かい格子の 1 マスごとに、法線を少しずつ振った点が月に一致したものだけ光らせる。
  // 格子は画面の高さ (CSS px) に比例させ、1 マスを約 1.3 CSS px に保つ。
  // 固定の格子数だと、スマホの画面では 1 マスが 2px 超になり、粗い四角として見えるため
  vec2 sp = p * uSparkCells;
  vec2 sc = floor(sp);
  vec2 sf = fract(sp) - 0.5;
  float sh = hash12(sc);
  // 法線の揺らぎを小さくして、月に一致するマスを光の道の近くだけに絞る。
  // 揺らぎが大きいと手前の海の左右に粒が散り、スマホで砂目の模様に見えるため
  vec2 jit = (vec2(hash12(sc + 7.3), hash12(sc + 1.9)) - 0.5) * 0.06;
  float rj = max(dot(reflect(d, normalize(n + vec3(jit.x, 0.0, jit.y))), M), 0.0);
  // マスの中心からずらした丸い点にする。四角いマス全体を光らせると、ブロック状の粒になるため
  vec2 spOff = (vec2(hash12(sc + 3.9), hash12(sc + 5.1)) - 0.5) * 0.4;
  float spot = 1.0 - smoothstep(0.25, 0.55, length(sf - spOff));
  // きらめきの点滅は 1 秒に 0.1〜0.3 回。ちらつかせず、ゆっくり瞬く程度にする
  float tw = 0.6 + 0.4 * sin(uTime * (0.6 + sh * 1.2) + sh * 50.0);
  // 水平線のすぐ下のきらめきは、パネルの文字の後ろに来るので少し抑える。
  // 手前 (画面の下) は月の道として明るいまま残す
  float nearHz = clamp((uHorizon - p.y) / 0.25, 0.0, 1.0);
  float spkDim = mix(0.55, 1.0, nearHz);
  col += SILVER * pow(rj, 260.0) * spot * step(0.80, sh) * tw * 6.0 * spkDim * (1.0 - F * 0.5);

  // 遠くの海は暗く、場所によって濃淡が違うようにする。
  // 霞で一様に白く溶かすと、水平線が平板な灰色の帯に見えるため。
  // 重みが 0 の遠景ではノイズを計算しない
  float far = smoothstep(4.0, 26.0, Z);
  if (far > 0.0) {
    float mottle = fbmLow(W * 0.18 + vec2(3.0, 7.0));
    col *= mix(1.0, 0.40 + 0.95 * mottle, far);
  }
  float hd = uHorizon - p.y;
  col = mix(col, HAZE_SEA, exp(-hd * 14.0) * 0.22);
  return col;
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  vec3 col;
  if (p.y > uHorizon) {
    col = sky(normalize(vec3(p.x, p.y - uHorizon, -FOCAL)), true);

    // 遠くの島。岬より先に描き、岬の手前に隠れるようにする。空に近い色で霞の中に溶かす
    // 層ごとに視差の量を変える (奥の層ほど小さく動く)
    vec2 pf = p - uPointer * PAR_FAR;
    // 島の高さは最大 0.011 なので、地平線の上 0.0125 より上では必ず 0。その外は計算を省く
    if (pf.y - uHorizon < 0.0125) {
      float farIsl = smoothstep(0.0008, -0.0008, pf.y - (uHorizon + farIslandTop(pf.x / uAspect)));
      col = mix(col, mix(col, vec3(0.02, 0.028, 0.038), 0.5), farIsl * 0.7);
    }

    // 岬と灯台は空の手前に描く。空の上に重ねるので、空だけがずれて見えないよう岬の座標でずらす
    vec2 pl = p - uPointer * PAR_LAND;
    float nx = pl.x / uAspect;
    float ux = (nx + 0.5) / 0.30;
    float inL = smoothstep(0.0, 0.02, ux) * (1.0 - smoothstep(0.98, 1.0, ux));
    // 岬の頂きは地平線の上 0.084 までしか届かないので、それより上の画素では岬の計算を省く
    float land = 0.0;
    if (inL > 0.0 && pl.y - uHorizon < 0.09) {
      float top = uHorizon + landTop(nx);
      land = smoothstep(0.0012, -0.0012, pl.y - top) * inL;
      // 岬は遠いので、空の色を混ぜて真っ黒にしない (大気遠近)。頂きは霞が少し薄い
      float hz = mix(0.42, 0.26, smoothstep(0.0, 0.06, p.y - uHorizon));
      vec3 landCol = mix(vec3(0.016, 0.024, 0.034), col, hz);
      // 右へ下がる斜面 (海側の断崖) に、月明かりの細い縁を入れる。左上がりの面は月と逆なので暗いまま
      float slope = (landTop(nx - 0.002) - landTop(nx + 0.002)) / 0.004;
      vec3 rim = MOON_TINT * clamp(slope * 0.5, 0.0, 1.0) * 0.09 * exp(-abs(top - pl.y) * 320.0);
      col = mix(col, landCol + rim, land);
    }

    // 灯台の光点と、ゆっくり回る光の帯
    vec2 lpt = vec2((-0.5 + 0.55 * 0.30) * uAspect, uHorizon + landTop(-0.5 + 0.55 * 0.30));
    vec2 ld = pl - lpt;
    col += vec3(1.0, 0.86, 0.6) * (exp(-dot(ld, ld) * 9000.0) * 0.45 + exp(-length(ld) * 40.0) * 0.04);
    // 光の帯は 1 周 約 29 秒。ゆっくり振れて、目で追える速さにする
    float a = uTime * 0.22;
    vec2 bd = normalize(vec2(cos(a), 0.05 * sin(a)));
    float along = dot(ld, bd);
    float across = length(ld - along * bd);
    // 霞に広がる光の帯。遠ざかるほど太く薄くなり、霞の濃淡で少しだけ揺らぐ
    float bw = 0.004 + 0.035 * max(along, 0.0);
    // 光の帯は幅の 6 倍より外や、灯台より後ろでは 0 (指数の減衰で見えない)。その外は計算を省く
    float cone = 0.0;
    if (along > 0.0 && across < 6.0 * bw) {
      cone = exp(-(across * across) / (bw * bw)) * smoothstep(0.0, 0.02, along) * exp(-along * 2.6);
      // 霞の揺らぎは遅く流す (速いと光の帯がざわついて見える)
      cone *= 0.75 + 0.25 * vnoise(vec2(along * 9.0 - uTime * 0.12, across * 40.0));
    }
    col += vec3(0.5, 0.56, 0.62) * cone * 0.10 * (1.0 - land);
  } else {
    col = seaColor(p);
  }

  // 露出と階調。拡張 Reinhard で、低い所は線形のまま残し、白だけを肩で丸める。
  // 指数カーブは暗部を持ち上げて灰色に濁らせるので使わない
  const float E = 1.6;
  const float W = 3.0;
  vec3 x = col * E;
  col = x * (1.0 + x / (W * W)) / (1.0 + x);
  col = min(col, vec3(1.0));
  // 黒を紺色に持ち上げ、暗部を青寄りの色調にそろえる
  col = NAVY_FLOOR + col * (1.0 - NAVY_FLOOR);
  // 周辺をごくわずかに落として写真の周辺減光を真似る (強いと隅が汚れて見える)
  vec2 v = vUv - 0.5;
  col *= 1.0 - 0.30 * dot(v, v);

  // 階調のバンディング防止と、フィルムのような細かい粒
  float g = hash12(gl_FragCoord.xy + fract(uTime * 7.31) * 113.0);
  col += (g - 0.5) * (1.5 / 255.0 + 0.004);

  gl_FragColor = vec4(col, 1.0);
}
`

type MoonlitUniforms = {
  uTime: { value: number }
  uAspect: { value: number }
  uPixel: { value: number }
  uPointer: { value: THREE.Vector2 }
  uHorizon: { value: number }
  uMoonR: { value: number }
  uSparkCells: { value: number }
}

// きらめき 1 マスの大きさ (CSS px)。540px 高の画面で従来の 420 マスと同じ密度になる
const SPARK_CELL_CSS = 540 / 420

export function MoonlitSeaTheme() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  // uniform の入れ物は一度だけ作り、画面サイズに依る値は毎フレーム useFrame で材質へ書く。
  // useMemo で作って props で渡すと、リサイズ後に値が古いまま残ることがあるため
  const uniforms = useMemo<MoonlitUniforms>(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uPixel: { value: 1 },
      uPointer: { value: new THREE.Vector2() },
      uHorizon: { value: 0 },
      uMoonR: { value: 0.064 },
      uSparkCells: { value: 420 },
    }),
    [],
  )

  useFrame((state, delta) => {
    const mat = matRef.current
    if (!mat) return
    // 毎フレームの値は材質の uniform に直接書く (フックに渡した値を書き換えない決まりに従う)
    const u = mat.uniforms as MoonlitUniforms
    // 画面サイズから毎フレーム求める。回転や窓のリサイズに追従させるため
    const { width, height } = state.size
    const aspect = width / height
    // 縦長 (aspect ≤ 0.5) で 1、横長 (aspect ≥ 1) で 0 の係数。横長の見え方は変えない
    const portrait = THREE.MathUtils.clamp((1 - aspect) / 0.5, 0, 1)
    u.uAspect.value = aspect
    u.uPixel.value = 1 / (height * state.viewport.dpr)
    // きらめきの格子は CSS px 基準。密度の高い画面でも点の大きさが変わらず、端末ごとに粗くならない
    u.uSparkCells.value = height / SPARK_CELL_CSS
    // 縦長では地平線を画面の約 48% の高さまで上げ、海に光の道を歩かせる余白を作る
    u.uHorizon.value = -0.08 + 0.1 * portrait
    // 縦長では幅に対して月が大きすぎるため、少し小さくする
    u.uMoonR.value = 0.064 - 0.008 * portrait
    u.uTime.value = state.clock.elapsedTime
    // マウスの追従は弱く、ゆっくり。フレームレートに依らず同じ速さに見えるよう、
    // 1 フレームごとの係数を delta から求める (固定値の lerp は高 fps で速くなる)
    u.uPointer.value.lerp(state.pointer, 1 - Math.exp(-delta * 1.2))
  })

  return (
    <>
      <color attach="background" args={["#05080e"]} />
      <mesh frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial ref={matRef} uniforms={uniforms} vertexShader={VERT} fragmentShader={FRAG} depthWrite={false} depthTest={false} />
      </mesh>
    </>
  )
}
