import type { Metadata, ResolvingMetadata } from "next";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";

type Props = {
  params: Promise<{ id: string }>;
};

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  let displayName = "Profile";
  let description = "View verified credentials, reputation score, skills, and professional identity secured on Sui.";
  
  try {
    const client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl("testnet"), network: "testnet" });
    const objectData = await client.getObject({
      id: id,
      options: { showContent: true }
    });

    if (objectData.data?.content?.dataType === "moveObject") {
      const fields = objectData.data.content.fields as any;
      displayName = fields.display_name || "Profile";
      
      // We can also extract the Walrus bio if needed, but keeping it simple for now
      if (fields.headline) {
        description = `${fields.headline}. View verified credentials, reputation score, and professional identity secured on Sui.`;
      }
    }
  } catch (err) {
    console.error("Failed to fetch profile for metadata:", err);
  }

  return {
    title: `${displayName} | Prooffolio Passport`,
    description,
    openGraph: {
      title: `${displayName} | Prooffolio Passport`,
      description,
      url: `${appUrl}/profile/${id}`,
      images: ["/og-image.png"],
    },
    twitter: {
      title: `${displayName} | Prooffolio Passport`,
      description,
      images: ["/og-image.png"],
    },
    alternates: {
      canonical: `${appUrl}/profile/${id}`,
    },
  };
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
