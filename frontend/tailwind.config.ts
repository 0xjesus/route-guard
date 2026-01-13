import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Mantle Official Brand Colors
      colors: {
        mantle: {
          // Primary Palette
          black: "#000000",
          white: "#FFFFFF",

          // Accent Colors - The signature Mantle green
          accent: {
            DEFAULT: "#65B3AE",
            light: "#8ECAC6",
            dark: "#4A9994",
            50: "#E8F5F4",
            100: "#D1EBE9",
            200: "#A3D7D3",
            300: "#8ECAC6",
            400: "#65B3AE",
            500: "#4A9994",
            600: "#3D7F7A",
            700: "#306561",
            800: "#234C48",
            900: "#16322F",
          },

          // Background Gradients
          bg: {
            primary: "#0A0B0D",
            secondary: "#12141A",
            tertiary: "#1A1D26",
            elevated: "#222632",
            card: "#181B23",
          },

          // Text Colors
          text: {
            primary: "#FFFFFF",
            secondary: "#A1A7B4",
            tertiary: "#6B7280",
            muted: "#4B5563",
          },

          // Status Colors
          success: "#10B981",
          warning: "#F59E0B",
          error: "#EF4444",
          info: "#3B82F6",
        },
      },

      // Typography - Material Design inspired
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },

      fontSize: {
        "display-lg": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-md": ["3.5rem", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "display-sm": ["2.5rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "headline-lg": ["2rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        "headline-md": ["1.5rem", { lineHeight: "1.4" }],
        "headline-sm": ["1.25rem", { lineHeight: "1.4" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6" }],
        "body-md": ["1rem", { lineHeight: "1.6" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5" }],
        "label-lg": ["0.875rem", { lineHeight: "1.4", letterSpacing: "0.01em" }],
        "label-md": ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.02em" }],
        "label-sm": ["0.6875rem", { lineHeight: "1.4", letterSpacing: "0.02em" }],
      },

      // Spacing - 8pt grid system (Material Design)
      spacing: {
        "0.5": "0.125rem", // 2px
        "1": "0.25rem",    // 4px
        "1.5": "0.375rem", // 6px
        "2": "0.5rem",     // 8px
        "2.5": "0.625rem", // 10px
        "3": "0.75rem",    // 12px
        "3.5": "0.875rem", // 14px
        "4": "1rem",       // 16px
        "5": "1.25rem",    // 20px
        "6": "1.5rem",     // 24px
        "7": "1.75rem",    // 28px
        "8": "2rem",       // 32px
        "9": "2.25rem",    // 36px
        "10": "2.5rem",    // 40px
        "12": "3rem",      // 48px
        "14": "3.5rem",    // 56px
        "16": "4rem",      // 64px
        "20": "5rem",      // 80px
        "24": "6rem",      // 96px
      },

      // Border Radius - Material Design
      borderRadius: {
        "none": "0",
        "xs": "0.125rem",  // 2px
        "sm": "0.25rem",   // 4px
        "md": "0.5rem",    // 8px
        "lg": "0.75rem",   // 12px
        "xl": "1rem",      // 16px
        "2xl": "1.5rem",   // 24px
        "3xl": "2rem",     // 32px
        "full": "9999px",
      },

      // Shadows - Elevation system
      boxShadow: {
        "elevation-1": "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)",
        "elevation-2": "0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)",
        "elevation-3": "0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)",
        "elevation-4": "0 15px 25px rgba(0,0,0,0.15), 0 5px 10px rgba(0,0,0,0.05)",
        "elevation-5": "0 20px 40px rgba(0,0,0,0.2)",
        "glow-accent": "0 0 20px rgba(101, 179, 174, 0.3)",
        "glow-accent-lg": "0 0 40px rgba(101, 179, 174, 0.4)",
        "inner-glow": "inset 0 0 20px rgba(101, 179, 174, 0.1)",
      },

      // Animations
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "fade-up": "fadeUp 0.6s ease-out",
        "slide-in-right": "slideInRight 0.4s ease-out",
        "slide-in-left": "slideInLeft 0.4s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "rotate-slow": "rotateSlow 20s linear infinite",
        "gradient-shift": "gradientShift 8s ease infinite",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(101, 179, 174, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(101, 179, 174, 0.6)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        rotateSlow: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },

      // Backdrop blur
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        "3xl": "40px",
      },

      // Z-index scale
      zIndex: {
        "behind": "-1",
        "base": "0",
        "raised": "1",
        "dropdown": "100",
        "sticky": "200",
        "overlay": "300",
        "modal": "400",
        "popover": "500",
        "toast": "600",
        "tooltip": "700",
        "max": "9999",
      },
    },
  },
  plugins: [],
};

export default config;
