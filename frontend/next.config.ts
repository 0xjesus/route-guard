import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  // Load environment variables from root .env
  env: {
    // The NEXT_PUBLIC_ vars are auto-loaded, but we ensure path is correct
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Webpack config to handle Three.js and Web3 modules
  webpack: (config, { isServer }) => {
    config.externals = [...(config.externals || []), { canvas: "canvas" }];

    // Fix for Web3 module resolution issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        "pino-pretty": false,
        lokijs: false,
        encoding: false,
      };
    }

    // Ignore optional peer dependencies
    config.resolve.alias = {
      ...config.resolve.alias,
      "pino-pretty": false,
      "@react-native-async-storage/async-storage": false,
    };

    return config;
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
