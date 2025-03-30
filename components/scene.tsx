"use client"

import { useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Float, Environment, Preload } from "@react-three/drei"
import { MathUtils, type Group, type Mesh } from "three"
import { useMotionValue, useSpring } from "framer-motion"
import { usePathname } from "next/navigation"

// パーティクルシステム
function Particles({ count = 200, color = "hsl(var(--primary))" }) {
  const mesh = useRef<Group>(null)
  const { viewport, mouse } = useThree()

  // パーティクルの位置を生成
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 10 // x
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10 // y
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10 // z
  }

  useFrame((state, delta) => {
    if (mesh.current) {
      mesh.current.rotation.x = MathUtils.lerp(mesh.current.rotation.x, mouse.y * 0.2, 0.1)
      mesh.current.rotation.y = MathUtils.lerp(mesh.current.rotation.y, mouse.x * 0.2, 0.1)
    }
  })

  return (
    <group ref={mesh}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.05} color={color} sizeAttenuation transparent opacity={0.4} />
      </points>
    </group>
  )
}

// 浮遊する幾何学オブジェクト
function FloatingObject({ position, scale, rotation, color = "hsl(var(--primary))" }) {
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
  return (
    <gridHelper
      args={[30, 30, "hsl(var(--muted-foreground)/10)", "hsl(var(--muted-foreground)/5)"]}
      position={[0, -3, 0]}
      rotation={[0, 0, 0]}
    />
  )
}

// マウス追従エフェクト
function MouseFollower() {
  const { viewport, mouse } = useThree()
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const smoothMouseX = useSpring(mouseX, { stiffness: 300, damping: 30 })
  const smoothMouseY = useSpring(mouseY, { stiffness: 300, damping: 30 })

  useFrame(() => {
    mouseX.set(mouse.x)
    mouseY.set(mouse.y)
  })

  return (
    <mesh position={[(smoothMouseX.get() * viewport.width) / 4, (-smoothMouseY.get() * viewport.height) / 4, -2]}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial
        color="hsl(var(--primary))"
        emissive="hsl(var(--primary))"
        emissiveIntensity={0.3}
        transparent
        opacity={0.4}
      />
    </mesh>
  )
}

// メインシーンコンテンツ
function SceneContent() {
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
      <FloatingObject position={[3, 1, -5]} scale={0.8} rotation={[0, 0, 0]} color="hsl(var(--primary))" />
      <FloatingObject position={[-3, -1, -3]} scale={0.6} rotation={[0, 0, 0]} color="hsl(var(--secondary))" />
      <FloatingObject position={[0, 2, -4]} scale={0.4} rotation={[0, 0, 0]} color="hsl(var(--accent))" />
      {isHomePage && (
        <>
          <FloatingObject position={[4, -2, -6]} scale={0.7} rotation={[0, 0, 0]} color="hsl(var(--primary))" />
          <FloatingObject position={[-4, 3, -5]} scale={0.5} rotation={[0, 0, 0]} color="hsl(var(--secondary))" />
        </>
      )}
      <Environment preset="city" intensity={0.3} />
      <Preload all />
    </>
  )
}

// エクスポートするシーンコンポーネント
export function Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 75 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <SceneContent />
    </Canvas>
  )
}

