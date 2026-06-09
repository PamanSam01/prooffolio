import type { Metadata } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Talent Graph | Discover Web3 Professionals",
  description: "Query the Prooffolio deterministic talent graph. Search verified professionals, filter by on-chain credentials, and discover top talent on the Sui network.",
  openGraph: {
    title: "Talent Graph | Discover Web3 Professionals",
    description: "Query the Prooffolio deterministic talent graph. Search verified professionals, filter by on-chain credentials, and discover top talent on the Sui network.",
    url: `${appUrl}/discover`,
    images: ["/og-image.png"],
  },
  twitter: {
    title: "Talent Graph | Discover Web3 Professionals",
    description: "Query the Prooffolio deterministic talent graph. Search verified professionals, filter by on-chain credentials, and discover top talent on the Sui network.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: `${appUrl}/discover`,
  },
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
