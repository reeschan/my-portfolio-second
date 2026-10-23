"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { loopTime } from "@/lib/background-frame"
import { introColors } from "@/lib/theme"

// ループの長さ (秒)。シェーダーの LOOP と必ず同じ値にする。動きはすべて
// この長さで 1 周する位相の関数なので、10 秒ごとに同じ姿へ戻り、つなぎ目が出ない
const GLASS_LOOP_SECONDS = 10

// 全画面の平面をクリップ空間へ直接置く。カメラ行列を通さないので、
// 画面の縦横比や FOV に関係なく必ず画面全体を覆える
const vertexShader = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

// ガラスの背景: 暗い紺の地に紫の光の玉が漂い、ガラスの破片が揺れながら回り、
// 光の帯がときどき横切り、塵が舞う。全体に薄いスモークをかけて落ち着かせる。
// すべての動きを 10 秒で 1 周する位相 ang の関数にしてあり、ループの境目が見えない
// (docs/specs/glass-theme-and-navigation.md、ADR 0012)
const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uBackdrop;
uniform vec3 uViolet;
uniform vec3 uPink;
uniform vec3 uTeal;

const float TAU = 6.28318530718;
const float LOOP = 10.0;
// スモークの濃さと全体の明るさは、試作で持ち主が決めた値
// (docs/specs/glass-theme-and-navigation.md)。動かす予定がないので定数にする
const float SMOKE = 0.7;
const float BRIGHT = 0.8;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v;
}

// ループするノイズ: ノイズの場を円の上で動かすので、位相が 1 周すると同じ場に戻る
float loopFbm(vec2 p, float ang, float r) {
  return fbm(p + r * vec2(cos(ang), sin(ang)));
}

vec3 screen(vec3 a, vec3 b) {
  return 1.0 - (1.0 - a) * (1.0 - b);
}

float blob(vec2 uv, vec2 c, float r) {
  vec2 d = uv - c;
  return exp(-dot(d, d) / (r * r));
}

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

// 地: 暗い紺に、紫を主役にした柔らかい光の玉。ang は 0〜TAU の位相
vec3 field(vec2 uv, float ang) {
  vec3 col = uBackdrop * (1.0 + 0.35 * (1.0 - uv.y));
  float n = loopFbm(uv * 1.6, ang, 0.6);
  // 玉の軌道は位相の整数倍の sin・cos なので、1 周で元に戻る
  vec2 c1 = vec2(-0.35, 0.10) + 0.22 * vec2(cos(ang), sin(2.0 * ang) * 0.6);
  vec2 c2 = vec2(0.45, -0.18) + 0.20 * vec2(sin(ang + 1.3), cos(ang + 0.4));
  vec2 c3 = vec2(0.10, 0.38) + 0.16 * vec2(cos(2.0 * ang + 2.1), sin(ang + 2.1));
  vec2 c4 = vec2(-0.60, -0.40) + 0.12 * vec2(sin(2.0 * ang), cos(ang + 0.9));
  col = screen(col, uViolet * 0.55 * blob(uv, c1, 0.55) * (0.75 + 0.5 * n));
  col = screen(col, uViolet * 0.40 * blob(uv, c2, 0.50) * (0.70 + 0.6 * n));
  col = screen(col, uPink * 0.22 * blob(uv, c3, 0.30));
  col = screen(col, uTeal * 0.16 * blob(uv, c4, 0.28));
  col += uViolet * 0.05 * smoothstep(0.45, 0.85, n);
  return col;
}

// 塵: セルごとに 1 粒。セルの場を流すと 1 周で隣のセルの粒に入れ替わってしまうので、
// 各粒が自分のセルの中で小さな円を描く (位相の整数倍の sin・cos なので 1 周で元に戻る)
vec3 dust(vec2 uv, float ang) {
  vec3 acc = vec3(0.0);
  for (int layer = 0; layer < 3; layer++) {
    float fl = float(layer);
    float scale = 9.0 + fl * 7.0;
    vec2 q = uv * scale;
    vec2 id = floor(q), f = fract(q) - 0.5;
    float h = hash(id + fl * 17.0);
    if (h > 0.55) {
      vec2 off = (vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5) * 0.5;
      float ph = h * TAU;
      float turns = (h > 0.8) ? 2.0 : 1.0;
      off += 0.18 * vec2(cos(ang * turns + ph), sin(ang * turns + ph) * 1.4);
      float d = length(f - off);
      float tw = 0.5 + 0.5 * sin(ang * (1.0 + floor(h * 3.0)) + h * TAU);
      acc += mix(uViolet, vec3(1.0), 0.5) * smoothstep(0.06, 0.0, d) * tw * (0.35 - fl * 0.08);
    }
  }
  return acc;
}

// 光の帯: 10 秒に 2 回、斜めに横切る
float sweep(vec2 uv, float p) {
  float s = fract(p * 2.0);
  float pos = mix(-1.6, 1.6, s);
  float x = dot(uv, normalize(vec2(1.0, 0.45)));
  return exp(-pow((x - pos) / 0.12, 2.0));
}

// ---- 漂うガラスの破片 ----

// 平行四辺形の符号付き距離。shear で横にずらし、破片らしい斜めの縁にする
float sdShard(vec2 p, vec2 size, float shear) {
  p.x -= shear * p.y;
  vec2 d = abs(p) - size;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

vec3 variantA(vec2 uv, float p, float ang) {
  vec3 col = field(uv, ang);
  float sw = sweep(uv, p);
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float h = hash(vec2(fi, 3.0));
    vec2 base = vec2(mix(-0.85, 0.85, hash(vec2(fi, 1.0))), mix(-0.45, 0.45, hash(vec2(fi, 2.0))));
    vec2 c = base + vec2(0.06 * sin(ang + fi), 0.08 * cos(ang + fi * 1.7));
    // 回転は「元の角度 ± 揺れ」か「1 周で整数回の回転」のどちらか。どちらも 1 周で元に戻る
    float spin = (h > 0.7) ? ang * (h > 0.85 ? 1.0 : -1.0) : 0.35 * sin(ang + fi * 2.3);
    vec2 q = rot(fi * 1.1 + spin) * (uv - c);
    vec2 size = vec2(0.07 + 0.09 * h, 0.03 + 0.05 * hash(vec2(fi, 5.0)));
    float d = sdShard(q, size, 0.6 * (h - 0.5));
    if (d < 0.0) {
      // 面: 背景を少しずらして描き (屈折の見た目)、明るくにじませる
      vec3 refr = field(uv + 0.03 * vec2(q.y, -q.x) / max(size.x, 0.05), ang);
      col = mix(col, refr * 1.15 + uViolet * 0.06 + 0.025, 0.85);
      col += vec3(1.0) * 0.18 * sw; // 帯がガラスの上を光る
    }
    // 縁の光。上を向いた縁ほど明るい
    float rim = smoothstep(0.006, 0.0, abs(d));
    float lit = 0.55 + 0.45 * (rot(fi * 1.1 + spin) * vec2(0.0, 1.0)).y;
    col += mix(uViolet, vec3(1.0), 0.6) * rim * 0.6 * lit;
    col += uViolet * 0.10 * smoothstep(0.05, 0.0, abs(d)) * (d > 0.0 ? 1.0 : 0.0);
  }
  col += uViolet * 0.05 * sw;
  return col + dust(uv, ang);
}

// スモーク: ゆがめたノイズを重ねた煙。ゆがみも位相の円の上で動かすので、10 秒で元に戻る
float smokeField(vec2 uv, float ang) {
  vec2 q = vec2(loopFbm(uv * 1.1, ang, 0.7), loopFbm(uv * 1.1 + 5.2, ang + 1.7, 0.7));
  return loopFbm(uv * 1.4 + 1.8 * q, ang + 0.6, 0.45);
}

vec3 applySmoke(vec3 col, vec2 uv, float ang) {
  float sm = smokeField(uv, ang);
  float dens = 0.45 + 0.55 * smoothstep(0.25, 0.8, sm);
  // 煙は地より少しだけ明るい、紫を含んだ灰色。全体を覆って明るさとコントラストを落とす
  vec3 smokeCol = mix(uBackdrop * 1.3, uViolet * 0.16, 0.35);
  col = mix(col, smokeCol, SMOKE * dens * 0.85);
  // 光が当たった煙の筋をうっすら残し、ただ暗いだけにしない
  col += uViolet * 0.035 * SMOKE * smoothstep(0.55, 0.85, sm);
  return col;
}

void main() {
  // 縦を [-1, 1] に正規化した座標。画面の縦横比が変わっても破片の形が崩れない
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  float p = uTime / LOOP; // 0〜1 の位相
  float ang = p * TAU;
  vec3 col = variantA(uv, p, ang);
  col = applySmoke(col, uv, ang) * BRIGHT;
  // 周辺を落とし、文字を載せる中央を少しだけ暗くしすぎない
  col *= 1.0 - 0.35 * dot(uv * vec2(0.6, 0.9), uv * vec2(0.6, 0.9));
  gl_FragColor = vec4(pow(clamp(col, 0.0, 1.0), vec3(0.95)), 1.0);
}
`

// 16 進の色を 0〜1 の sRGB のまま vec3 にする。THREE.Color を使うと three.js の
// 色管理で線形の値に変換されるが、このシェーダーは gl_FragColor に直接書き、出力の
// 色空間の変換を通さない。そのため THREE.Color で渡すと試作より暗く沈む。
// トークンの 16 進の値 (sRGB) をそのまま渡すため、Vector3 を自分で作る
function srgbVector(hex: string): THREE.Vector3 {
  const n = Number.parseInt(hex.slice(1), 16)
  return new THREE.Vector3(((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255)
}

export function GlassTheme() {
  const matRef = useRef<THREE.ShaderMaterial>(null)

  // 描画中に new しないよう、uniform の箱はすべて初回に作る。
  // 色は導入演出と揃えるため lib/theme.ts のトークンから取り、2 度と変えない
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uBackdrop: { value: srgbVector(introColors.backdrop) },
      uViolet: { value: srgbVector(introColors.violet) },
      uPink: { value: srgbVector(introColors.pink) },
      uTeal: { value: srgbVector(introColors.teal) },
    }),
    [],
  )

  useFrame((state) => {
    const mat = matRef.current
    if (!mat) return
    // 材質が持つ uniforms は Record<string, IUniform> 型なので、作ったときの形に戻して使う
    const u = mat.uniforms as typeof uniforms
    const { size, viewport, clock } = state
    // 描画バッファの実ピクセル数で渡す。dpr を掛けないと光の帯や塵がぼやけて見える
    u.uResolution.value.set(size.width * viewport.dpr, size.height * viewport.dpr)
    // 経過時間をそのまま渡すと長時間で精度が落ちる。ループの長さで割った余りにする
    u.uTime.value = loopTime(clock.elapsedTime, GLASS_LOOP_SECONDS)
  })

  return (
    <>
      <color attach="background" args={[introColors.backdrop]} />
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
