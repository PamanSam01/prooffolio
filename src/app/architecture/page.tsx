import Link from "next/link";
import { ArrowDown, Database, Search, FileText, ShieldCheck } from "lucide-react";

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-[#121212] text-[#EDEDED] font-sans selection:bg-[#3ECF8E]/30 selection:text-[#EDEDED] pb-24">
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#3e3e3e] bg-[#1c1c1c] sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-[#3ECF8E] flex items-center justify-center rounded-sm">
            <span className="text-[#1c1c1c] font-bold text-xs">P</span>
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#EDEDED]">Prooffolio</span>
        </div>
        <nav className="flex items-center gap-6">
          <Link href="/" className="text-xs font-medium text-[#A0A0A0] hover:text-[#EDEDED] transition-colors">Return Home</Link>
          <Link href="/dashboard" className="text-xs font-medium bg-[#3ECF8E] text-[#1c1c1c] px-4 py-2 hover:bg-[#2fb379] rounded transition-colors shadow-sm">
            Access Dashboard
          </Link>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto pt-16 px-6">
        <div className="mb-16">
          <h1 className="text-3xl font-bold tracking-tight mb-3 text-[#EDEDED]">Protocol Architecture</h1>
          <p className="text-sm text-[#A0A0A0] max-w-2xl leading-relaxed">
            Prooffolio AI is a trust infrastructure layer. We combine the high-throughput object model of Sui with the decentralized blob storage of Walrus to create an immutable ledger for professional reputation.
          </p>
        </div>

        <div className="space-y-4 relative">
          
          {/* Step 1: Organizations */}
          <div className="flex flex-col md:flex-row gap-6 p-6 bg-[#1c1c1c] border border-[#3e3e3e] rounded shadow-sm">
            <div className="w-16 h-16 shrink-0 bg-[#2a2a2a] border border-[#3e3e3e] flex items-center justify-center rounded">
              <FileText className="text-[#A0A0A0]" size={24} />
            </div>
            <div>
              <div className="text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-1">Layer 1: Issuance</div>
              <h2 className="text-lg font-semibold mb-2 text-[#EDEDED]">Organizations Issue Cryptographic Proofs</h2>
              <p className="text-sm text-[#A0A0A0] leading-relaxed">
                Universities, employers, and hackathons act as trusted authorities. They use the Organization Portal to cryptographically sign claims about a user's skills or tenure.
              </p>
            </div>
          </div>

          <div className="flex justify-center py-2 text-[#A0A0A0]">
            <ArrowDown size={16} />
          </div>

          {/* Step 2: Sui Smart Contracts */}
          <div className="flex flex-col md:flex-row gap-6 p-6 bg-[#2a2a2a] border border-[#3B82F6]/30 shadow-[0_0_15px_rgba(59,130,246,0.05)] rounded">
            <div className="w-16 h-16 shrink-0 bg-[#1c1c1c] border border-[#3B82F6] flex items-center justify-center rounded">
              <ShieldCheck className="text-[#3B82F6]" size={24} />
            </div>
            <div>
              <div className="text-xs font-bold text-[#3B82F6] uppercase tracking-widest mb-1">Layer 2: Settlement</div>
              <h2 className="text-lg font-semibold mb-2 text-[#EDEDED]">Minted as Owned Objects on Sui Testnet</h2>
              <p className="text-sm text-[#A0A0A0] leading-relaxed">
                The signed claim is minted as a dynamic NFT on Sui. Sui's unique object-centric model means the credential is quite literally <strong>owned</strong> by the talent's wallet address, enabling instant verification.
              </p>
            </div>
          </div>

          <div className="flex justify-center py-2 text-[#A0A0A0]">
            <ArrowDown size={16} />
          </div>

          {/* Step 3: Walrus Storage */}
          <div className="flex flex-col md:flex-row gap-6 p-6 bg-[#1c1c1c] border border-[#3e3e3e] rounded shadow-sm">
            <div className="w-16 h-16 shrink-0 bg-[#2a2a2a] border border-[#3e3e3e] flex items-center justify-center rounded">
              <Database className="text-[#A0A0A0]" size={24} />
            </div>
            <div>
              <div className="text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-1">Layer 3: Storage</div>
              <h2 className="text-lg font-semibold mb-2 text-[#EDEDED]">Heavy Data Pinned to Walrus Testnet</h2>
              <p className="text-sm text-[#A0A0A0] leading-relaxed">
                Storing PDFs, certificates, and long-form metadata directly on-chain is cost-prohibitive. We push this heavy data to Walrus and store only the immutable `Blob_ID` in the Sui object.
              </p>
            </div>
          </div>

          <div className="flex justify-center py-2 text-[#A0A0A0]">
            <ArrowDown size={16} />
          </div>

          {/* Step 4: AI Discovery */}
          <div className="flex flex-col md:flex-row gap-6 p-6 bg-[#2a2a2a] border border-[#3ECF8E]/30 shadow-[0_0_15px_rgba(62,207,142,0.05)] rounded">
            <div className="w-16 h-16 shrink-0 bg-[#1c1c1c] border border-[#3ECF8E] flex items-center justify-center rounded">
              <Search className="text-[#3ECF8E]" size={24} />
            </div>
            <div>
              <div className="text-xs font-bold text-[#3ECF8E] uppercase tracking-widest mb-1">Layer 4: Query Engine</div>
              <h2 className="text-lg font-semibold mb-2 text-[#EDEDED]">Indexing the Talent Graph</h2>
              <p className="text-sm text-[#A0A0A0] leading-relaxed">
                Our custom indexer reads the Sui chain and Walrus metadata, feeding a structured talent graph. We expose this graph to recruiters via semantic search, surfacing talent based purely on cryptographic evidence.
              </p>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
