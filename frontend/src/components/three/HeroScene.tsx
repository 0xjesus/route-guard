"use client";

import { motion } from "framer-motion";

/**
 * Hero Scene - Simple CSS animation (React 19 compatible)
 * Replaces Three.js due to React version incompatibility
 */
export default function HeroScene() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-mantle-bg-primary">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-radial from-mantle-accent/20 via-transparent to-transparent animate-pulse" />

      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-mantle-accent/60"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: ["0%", "-20%", "0%"],
            opacity: [0.3, 0.8, 0.3],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 3 + i * 0.2,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Central glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="w-64 h-64 rounded-full bg-mantle-accent/30 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Orbital rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {[1, 1.5, 2].map((scale, i) => (
          <motion.div
            key={i}
            className="absolute border border-mantle-accent/20 rounded-full"
            style={{
              width: 150 * scale,
              height: 150 * scale,
              left: -(150 * scale) / 2,
              top: -(150 * scale) / 2,
            }}
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 10 + i * 5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, #65B3AE 1px, transparent 1px),
            linear-gradient(to bottom, #65B3AE 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />
    </div>
  );
}
