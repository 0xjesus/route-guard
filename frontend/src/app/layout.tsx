import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://roadguard.app"),
  title: "RoadGuard | Privacy-First Road Incident Reports on Mantle",
  description:
    "Report road incidents anonymously and earn rewards. A decentralized, privacy-preserving platform built on Mantle L2 for community safety.",
  keywords: [
    "road safety",
    "web3",
    "mantle",
    "blockchain",
    "anonymous reporting",
    "decentralized",
    "L2",
    "ethereum",
  ],
  authors: [{ name: "RoadGuard Team" }],
  icons: {
    icon: "/images/logo.png",
    apple: "/images/logo.png",
  },
  openGraph: {
    title: "RoadGuard | Privacy-First Road Incident Reports",
    description: "Report road incidents anonymously and earn rewards on Mantle L2.",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/images/og-image-road-guard.png",
        width: 1200,
        height: 630,
        alt: "RoadGuard - Decentralized Road Safety on Mantle",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RoadGuard | Privacy-First Road Incident Reports",
    description: "Report road incidents anonymously and earn rewards on Mantle L2.",
    images: ["/images/og-image-road-guard.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0A0B0D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Maps */}
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://maps.gstatic.com" crossOrigin="" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
