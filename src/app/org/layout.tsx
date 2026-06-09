import type { Metadata } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Organizations | Issue Verifiable Credentials",
  description: "Register your organization on Sui to issue immutable, cryptographically signed credentials directly to professional passports.",
  openGraph: {
    title: "Organizations | Issue Verifiable Credentials",
    description: "Register your organization on Sui to issue immutable, cryptographically signed credentials directly to professional passports.",
    url: `${appUrl}/org`,
    images: ["/og-image.png"],
  },
  twitter: {
    title: "Organizations | Issue Verifiable Credentials",
    description: "Register your organization on Sui to issue immutable, cryptographically signed credentials directly to professional passports.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: `${appUrl}/org`,
  },
};

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
