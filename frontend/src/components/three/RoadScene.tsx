"use client";

import { useEffect, useRef } from "react";

// Pure CSS/Canvas animated background - no React Three Fiber dependency issues
export default function RoadScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Particles
    const particles: Array<{
      x: number;
      y: number;
      z: number;
      speed: number;
      color: string;
    }> = [];

    const colors = ["#65B3AE", "#4A9A95", "#3D8580", "#2F6F6B"];
    const markerColors = ["#EF4444", "#F97316", "#A855F7", "#3B82F6", "#EAB308"];

    // Initialize particles
    for (let i = 0; i < 200; i++) {
      particles.push({
        x: (Math.random() - 0.5) * canvas.width * 2,
        y: (Math.random() - 0.5) * canvas.height,
        z: Math.random() * 1000,
        speed: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // Floating markers
    const markers = markerColors.map((color, i) => ({
      x: canvas.width * 0.2 + (i * canvas.width * 0.15),
      y: canvas.height * 0.4 + Math.sin(i) * 50,
      baseY: canvas.height * 0.4 + Math.sin(i) * 50,
      color,
      phase: i * 0.5,
      size: 8,
    }));

    let animationId: number;
    let time = 0;

    const animate = () => {
      ctx.fillStyle = "rgba(10, 10, 10, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      time += 0.02;

      // Draw and update particles (road effect)
      particles.forEach((p) => {
        // Perspective projection
        const perspective = 400 / (400 + p.z);
        const screenX = canvas.width / 2 + p.x * perspective;
        const screenY = canvas.height / 2 + p.y * perspective;
        const size = Math.max(0.5, 3 * perspective);

        // Draw particle with glow
        const gradient = ctx.createRadialGradient(
          screenX,
          screenY,
          0,
          screenX,
          screenY,
          size * 2
        );
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, "transparent");

        ctx.beginPath();
        ctx.arc(screenX, screenY, size * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Move particle towards camera
        p.z -= p.speed;
        if (p.z < 1) {
          p.z = 1000;
          p.x = (Math.random() - 0.5) * canvas.width * 2;
          p.y = (Math.random() - 0.5) * canvas.height;
        }
      });

      // Draw floating markers
      markers.forEach((m) => {
        m.y = m.baseY + Math.sin(time + m.phase) * 20;

        // Glow effect
        const glowGradient = ctx.createRadialGradient(
          m.x,
          m.y,
          0,
          m.x,
          m.y,
          m.size * 4
        );
        glowGradient.addColorStop(0, m.color + "80");
        glowGradient.addColorStop(0.5, m.color + "30");
        glowGradient.addColorStop(1, "transparent");

        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        ctx.fillStyle = m.color;
        ctx.fill();

        // Highlight
        ctx.beginPath();
        ctx.arc(m.x - m.size * 0.3, m.y - m.size * 0.3, m.size * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fill();
      });

      // Draw rotating ring
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height * 0.45);
      ctx.rotate(time * 0.3);

      ctx.beginPath();
      ctx.strokeStyle = "#65B3AE";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#65B3AE";
      ctx.shadowBlur = 20;

      for (let i = 0; i < 100; i++) {
        const angle = (i / 100) * Math.PI * 2;
        const radius = 150;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 0.3; // Ellipse for 3D effect

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // Grid lines (road lanes)
      ctx.strokeStyle = "rgba(101, 179, 174, 0.1)";
      ctx.lineWidth = 1;

      for (let i = -5; i <= 5; i++) {
        const startX = canvas.width / 2 + i * 100;
        const endX = canvas.width / 2 + i * 20;

        ctx.beginPath();
        ctx.moveTo(startX, canvas.height);
        ctx.lineTo(endX, canvas.height * 0.3);
        ctx.stroke();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-gradient-to-b from-[#0a0a0a] via-[#0d1117] to-[#161b22]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      {/* Additional CSS animated elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-mantle-accent/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-orange-500/10 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>
    </div>
  );
}
