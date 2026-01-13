"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import {
  ChevronRight,
  MapPin,
  Shield,
  Coins,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";

interface HeroSectionProps {
  onGetStarted: () => void;
  stats?: {
    totalReports: number;
  };
}

const steps = [
  {
    image: "/images/step1-report.png",
    title: "Report",
    description: "Tap the map to report road incidents instantly",
    icon: MapPin,
    color: "#EF4444",
  },
  {
    image: "/images/step2-verify.png",
    title: "Verify",
    description: "Community confirms reports for accuracy",
    icon: Users,
    color: "#3B82F6",
  },
  {
    image: "/images/step3-earn.png",
    title: "Earn",
    description: "Get MNT rewards for verified reports",
    icon: Coins,
    color: "#65B3AE",
  },
];

export default function HeroSection({ onGetStarted, stats }: HeroSectionProps) {
  const { isConnected } = useAccount();
  const [activeStep, setActiveStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Hero Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-bg.png"
          alt="Futuristic city roads"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-mantle-bg-primary" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <header className="p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo.png"
              alt="RoadGuard Logo"
              width={48}
              height={48}
              className="w-10 h-10 sm:w-12 sm:h-12"
            />
            <span className="text-xl font-bold text-white">RoadGuard</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-mantle-accent/20 border border-mantle-accent/30 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-mantle-accent animate-pulse" />
            <span className="text-xs font-medium text-mantle-accent">Mantle L2</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-8">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
              <span className="text-white">Road Safety,</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-mantle-accent to-cyan-400">
                Rewarded
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-white/70 max-w-md mx-auto">
              Report incidents. Help your community. Earn crypto.
            </p>
          </motion.div>

          {/* How it works - Interactive Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="w-full max-w-2xl mb-8"
          >
            {/* Step Cards */}
            <div className="flex justify-center gap-3 sm:gap-6 mb-6">
              {steps.map((step, i) => {
                const Icon = step.icon;
                const isActive = activeStep === i;

                return (
                  <motion.button
                    key={i}
                    onClick={() => setActiveStep(i)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative flex flex-col items-center p-3 sm:p-4 rounded-2xl transition-all duration-300 ${
                      isActive
                        ? "bg-white/15 border-2 border-mantle-accent shadow-[0_0_20px_rgba(101,179,174,0.3)]"
                        : "bg-white/5 border-2 border-transparent hover:bg-white/10"
                    }`}
                  >
                    <div
                      className={`w-14 h-14 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center mb-2 transition-all duration-300`}
                      style={{
                        backgroundColor: isActive ? step.color : 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <Icon className={`w-7 h-7 sm:w-10 sm:h-10 ${isActive ? "text-white" : "text-white/50"}`} />
                    </div>
                    <span className={`text-sm font-semibold transition-colors ${isActive ? "text-white" : "text-white/50"}`}>
                      {step.title}
                    </span>

                    {/* Step number */}
                    <div
                      className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all`}
                      style={{
                        backgroundColor: isActive ? step.color : 'rgba(255,255,255,0.2)',
                        color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {i + 1}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Active step description with image */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center"
              >
                <div className="relative w-24 h-24 mb-3">
                  <Image
                    src={steps[activeStep].image}
                    alt={steps[activeStep].title}
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-white/80 text-lg text-center max-w-sm">
                  {steps[activeStep].description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Progress bar */}
            <div className="flex justify-center gap-2 mt-4">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === activeStep ? "w-8 bg-mantle-accent" : "w-2 bg-white/20"
                  }`}
                />
              ))}
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <button
              onClick={onGetStarted}
              className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-mantle-accent to-cyan-500 text-black font-bold text-lg flex items-center gap-3 shadow-[0_0_40px_rgba(101,179,174,0.4)] hover:shadow-[0_0_60px_rgba(101,179,174,0.6)] transition-all hover:scale-105"
            >
              <Zap className="w-5 h-5" />
              {isConnected ? "Open Dashboard" : "Get Started"}
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

          {/* Real stats - only show if we have real data from contract */}
          {stats && stats.totalReports > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-8 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-sm text-white/70"
            >
              <Shield className="w-4 h-4 text-mantle-accent" />
              <span>{stats.totalReports} verified reports on-chain</span>
            </motion.div>
          )}

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-white/40"
          >
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Verified Contract
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-mantle-accent" />
              Mantle Mainnet
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Privacy-First
            </span>
          </motion.div>
        </main>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-mantle-bg-primary to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
