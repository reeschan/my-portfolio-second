"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Float } from "@react-three/drei"
import { MathUtils, type Group, type Mesh } from "three"
import type { ThreeElements } from "@react-three/fiber"
import { usePathname } from "next/navigation"
import { sceneColors } from "@/lib/theme"

// three.js は CSS 変数 (hsl(var(--primary)) など) を解釈できないため、テーマ色の定数を使う
const COLORS = sceneColors

// -5〜5 の立方体にランダムに散らした座標 (x, y, z の並び)
function randomPositions(count: number) {
  const array = new Float32Array(count * 3)
  for (let i = 0; i < array.length; i++) array[i] = (Math.random() - 0.5) * 10
  return array
}

// パーティクルシステム
function Particles({ count = 200, color = COLORS.primary }) {
  const mesh = useRef<Group>(null)

  // パーティクルの位置 (count が変わったときだけ作り直す)。乱数は描画のたびに変わらないよう useMemo に閉じ込める
  const positions = useMemo(() => randomPositions(count), [count])

  useFrame((state, delta) => {
    if (mesh.current) {
      // 係数を経過時間から求め、フレームの数 (間引きの有無) が変わっても追従の速さを変えない。60fps のとき約 0.1
      const t = 1 - Math.exp(-delta * 6)
      mesh.current.rotation.x = MathUtils.lerp(mesh.current.rotation.x, state.pointer.y * 0.2, t)
      mesh.current.rotation.y = MathUtils.lerp(mesh.current.rotation.y, state.pointer.x * 0.2, t)
    }
  })

  return (
    <group ref={mesh}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.05} color={color} sizeAttenuation transparent opacity={0.4} />
      </points>
    </group>
  )
}

type MeshProps = ThreeElements["mesh"]

type FloatingObjectProps = {
  position: MeshProps["position"]
  scale: MeshProps["scale"]
  rotation: MeshProps["rotation"]
  color?: string
}

// 浮遊する幾何学オブジェクト
function FloatingObject({ position, scale, rotation, color = COLORS.primary }: FloatingObjectProps) {
  const mesh = useRef<Mesh>(null)

  useFrame((state, delta) => {
    if (mesh.current) {
      mesh.current.rotation.x += delta * 0.1
      mesh.current.rotation.y += delta * 0.15
    }
  })

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={mesh} position={position} scale={scale} rotation={rotation}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={color} wireframe={true} transparent opacity={0.4} />
      </mesh>
    </Float>
  )
}

// グリッド
function Grid() {
  return <gridHelper args={[30, 30, COLORS.gridCenter, COLORS.grid]} position={[0, -3, 0]} rotation={[0, 0, 0]} />
}

// マウス追従エフェクト
function MouseFollower() {
  const mesh = useRef<Mesh>(null)

  // 位置は描画ではなくフレームごとに mesh へ直接書き込む。React の再描画を待たずに球が動く
  useFrame((state, delta) => {
    if (!mesh.current) return
    // pointer.y は上が正なので、そのまま使うと画面のマウスと同じ向きに動く
    const targetX = (state.pointer.x * state.viewport.width) / 4
    const targetY = (state.pointer.y * state.viewport.height) / 4
    // 係数を経過時間から求め、フレームの数が変わっても追従の速さを変えない
    const t = 1 - Math.exp(-delta * 10)
    mesh.current.position.x = MathUtils.lerp(mesh.current.position.x, targetX, t)
    mesh.current.position.y = MathUtils.lerp(mesh.current.position.y, targetY, t)
  })

  return (
    <mesh ref={mesh} position={[0, 0, -2]}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial color={COLORS.primary} emissive={COLORS.primary} emissiveIntensity={0.3} transparent opacity={0.4} />
    </mesh>
  )
}

// テーマ「グリッド」: サイト開設時からの既定の背景
export function GridTheme() {
  const pathname = usePathname()
  const isHomePage = pathname === "/"

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.3} />
      <Particles count={isHomePage ? 300 : 200} /> {/* トップページではパーティクルを増やす */}
      <Grid />
      <MouseFollower />
      {/* トップページでは浮遊オブジェクトを増やす */}
      <FloatingObject position={[3, 1, -5]} scale={0.8} rotation={[0, 0, 0]} color={COLORS.primary} />
      <FloatingObject position={[-3, -1, -3]} scale={0.6} rotation={[0, 0, 0]} color={COLORS.secondary} />
      <FloatingObject position={[0, 2, -4]} scale={0.4} rotation={[0, 0, 0]} color={COLORS.accent} />
      {isHomePage && (
        <>
          <FloatingObject position={[4, -2, -6]} scale={0.7} rotation={[0, 0, 0]} color={COLORS.primary} />
          <FloatingObject position={[-4, 3, -5]} scale={0.5} rotation={[0, 0, 0]} color={COLORS.secondary} />
        </>
      )}
    </>
  )
}
