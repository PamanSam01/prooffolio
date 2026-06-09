import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@mysten/dapp-kit/dist/index.css";
import SuiProvider from "@/components/SuiProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    template: "%s | Prooffolio",
    default: "Prooffolio | Verifiable Professional Identity on Sui",
  },
  description: "Create a decentralized professional passport, receive verifiable credentials, build on-chain reputation, and discover trusted talent using Sui and Walrus.",
  openGraph: {
    title: "Prooffolio | Verifiable Professional Identity on Sui",
    description: "Create a decentralized professional passport, receive verifiable credentials, build on-chain reputation, and discover trusted talent using Sui and Walrus.",
    url: appUrl,
    siteName: "Prooffolio",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Prooffolio Banner",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prooffolio | Verifiable Professional Identity on Sui",
    description: "Create a decentralized professional passport, receive verifiable credentials, build on-chain reputation, and discover trusted talent using Sui and Walrus.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["WebSite", "Organization", "SoftwareApplication"],
    "name": "Prooffolio",
    "url": appUrl,
    "description": "Professional reputation backed by cryptographic proof.",
    "applicationCategory": "Professional Identity Platform",
    "operatingSystem": "All",
    "softwareRequirements": "Sui Network"
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SuiProvider>
          {children}
        </SuiProvider>
      </body>
    </html>
  );
}
