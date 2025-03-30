"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"

// クライアントサイドでのみインポートするためにdynamic importを使用
const Scene = dynamic(() => import("./scene").then((mod) => mod.Scene), {
  ssr: false,
  loading: () => <div className="fixed inset-0 -z-10 bg-background/50" />,
})

export function BackgroundScene() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <div className="fixed inset-0 -z-10 bg-background/50" />
  }

  return (
    <div className="fixed inset-0 -z-10">
      <Scene />
    </div>
  )
}

