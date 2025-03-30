"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <AnimatePresence>
        {isLoaded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center"
          >
            <motion.h1
              className="mb-12 text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            >
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Ryuki Tobita
              </span>
              <span className="block mt-2">Portfolio</span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
            >
              <Link
                href="/overview"
                className="group relative inline-block text-2xl font-medium text-primary transition-colors hover:text-primary/90"
              >
                Enter
                <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

