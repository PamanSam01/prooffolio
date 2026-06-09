"use client";

import { useState, useEffect } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { ORGANIZATION_REGISTERED_EVENT, CREDENTIAL_ISSUED_EVENT } from "@/lib/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Search, 
  Loader2, 
  ShieldCheck, 
  Globe,
  Network,
  Copy,
  Check
} from "lucide-react";
import { ExplorerLink } from "@/components/ui/ExplorerLink";

export default function OrganizationsDirectory() {
  const router = useRouter();
  const suiClient = useSuiClient();

  const CopyAddressButton = ({ address }: { address: string }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <button onClick={handleCopy} className="text-[#808080] hover:text-[#3B82F6] transition-colors p-1 bg-white/5 rounded ml-2" title="Copy Address">
        {copied ? <Check size={12} className="text-[#3ECF8E]" /> : <Copy size={12} />}
      </button>
    );
  };

  const [orgs, setOrgs] = useState<any[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function fetchOrgs() {
      setIsLoading(true);
      try {
        const eventsResponse = await suiClient.queryEvents({
          query: { MoveEventType: ORGANIZATION_REGISTERED_EVENT },
          order: "descending",
          limit: 100
        });

        const credEvents = await suiClient.queryEvents({
          query: { MoveEventType: CREDENTIAL_ISSUED_EVENT },
          limit: 1000
        });

        const orgIds = Array.from(new Set(eventsResponse.data.map(e => (e.parsedJson as any).org_id)));

        if (orgIds.length === 0) {
          setIsLoading(false);
          return;
        }

        const orgObjects = await suiClient.multiGetObjects({
          ids: orgIds,
          options: { showContent: true }
        });

        const formattedOrgs = orgObjects.map(obj => {
          const fields = (obj.data?.content as any)?.fields;
          if (!fields) return null;
          
          const orgId = obj.data?.objectId;
          const trueIssuedCount = credEvents.data.filter(e => (e.parsedJson as any).org_id === orgId).length;
          
          // Fallback to event if fields.owner is missing
          const eventForOrg = eventsResponse.data.find(e => (e.parsedJson as any).org_id === orgId);
          const ownerAddress = fields.owner || (eventForOrg?.parsedJson as any)?.owner || "0x0000000000000000000000000000000000000000";

          return {
            id: orgId,
            owner: ownerAddress,
            name: fields.name,
            website: fields.website,
            description: fields.description,
            logoBlobId: fields.logo_blob_id,
            orgType: fields.org_type || "Organization",
            isVerified: fields.is_verified,
            issuedCount: trueIssuedCount
          };
        }).filter(Boolean);

        // Sort by verified first, then by issued count
        formattedOrgs.sort((a: any, b: any) => {
          if (a.isVerified && !b.isVerified) return -1;
          if (!a.isVerified && b.isVerified) return 1;
          return b.issuedCount - a.issuedCount;
        });

        setOrgs(formattedOrgs);
        setFilteredOrgs(formattedOrgs);
        setIsLoading(false);
      } catch (e) {
        console.error("Failed to fetch organizations:", e);
        setIsLoading(false);
      }
    }
    fetchOrgs();
  }, [suiClient]);

  useEffect(() => {
    if (!query) {
      setFilteredOrgs(orgs);
    } else {
      const q = query.toLowerCase();
      setFilteredOrgs(orgs.filter(org => 
        org.name.toLowerCase().includes(q) || 
        org.description.toLowerCase().includes(q) ||
        org.orgType.toLowerCase().includes(q)
      ));
    }
  }, [query, orgs]);

  return (
    <div className="relative min-h-screen font-sans selection:bg-[#3B82F6]/30 selection:text-white pb-24 overflow-x-hidden bg-[#050816]">
      
      {/* Ambient Background Orbs */}
      <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#3B82F6]/10 blur-[150px] pointer-events-none z-0"></div>

      <div className="relative z-10">
        <header className="px-8 py-5 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50 shadow-sm">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Prooffolio Logo" className="w-8 h-8 object-contain" />
            <span className="font-semibold text-lg tracking-tight text-white">Prooffolio</span>
          </Link>
          <nav className="flex items-center gap-6">
            <button onClick={() => router.back()} className="text-xs font-bold uppercase tracking-widest text-[#808080] hover:text-[#3B82F6] transition-colors flex items-center gap-2 cursor-pointer">
              Go Back
            </button>
          </nav>
        </header>

        <main className="w-full max-w-[1440px] 2xl:max-w-[1600px] mx-auto pt-16 px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-3xl">
            <div className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-widest mb-3 flex items-center gap-2">
              <Network size={14} /> Ecosystem Directory
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">Network Organizations.</h1>
            <p className="text-[#808080] text-sm leading-relaxed mb-8">
              Discover verified issuers, enterprise partners, and decentralized protocols operating within the Prooffolio trust network.
            </p>

            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#555] group-focus-within:text-[#3B82F6] transition-colors" size={20} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search organizations by name, type, or description..."
                className="w-full bg-black/40 backdrop-blur-xl border border-white/10 text-white text-sm font-mono rounded-2xl pl-14 pr-6 py-5 focus:outline-none focus:border-[#3B82F6] transition-colors shadow-2xl"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-24 text-center">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-[#3B82F6] blur-[20px] opacity-20 rounded-full"></div>
                <Loader2 className="w-10 h-10 animate-spin text-[#3B82F6] relative z-10 mx-auto" />
              </div>
              <div className="text-[10px] text-[#A0A0A0] font-mono animate-pulse uppercase tracking-widest">Indexing Organizations...</div>
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="py-24 text-center text-[#808080] bg-black/20 border border-white/5 rounded-3xl backdrop-blur-sm">
              <Building2 size={48} className="text-[#333] mx-auto mb-4" />
              <div className="font-bold mb-1 text-sm text-white">No Organizations Found</div>
              <div className="text-xs font-mono">Try adjusting your search query.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {filteredOrgs.map((org, i) => (
                <div key={i} className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl hover:border-white/20 transition-all duration-500 group flex flex-col">
                  <div className="p-6 relative z-10 flex-grow">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-16 h-16 rounded-2xl border border-white/10 bg-[#0c0c0c] overflow-hidden flex items-center justify-center shadow-inner relative">
                        {org.logoBlobId ? (
                          <img src={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${org.logoBlobId}`} className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" alt="Logo" />
                        ) : (
                          <Building2 size={24} className="text-[#555]" />
                        )}
                      </div>
                      
                      {org.isVerified && (
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#3ECF8E] bg-[#3ECF8E]/10 border border-[#3ECF8E]/30 px-3 py-1.5 rounded-full uppercase tracking-widest shadow-[0_0_15px_rgba(62,207,142,0.15)]">
                          <ShieldCheck size={12} /> Verified Issuer
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2 leading-tight">{org.name}</h3>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#3B82F6] mb-4">{org.orgType}</div>
                    
                    <p className="text-xs text-[#808080] line-clamp-3 leading-relaxed mb-6">
                      {org.description || "No description provided."}
                    </p>

                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-4 text-[10px] font-mono text-[#555]">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#808080] uppercase tracking-widest mb-1">Proofs Issued</span>
                          <span className="text-white text-sm">{org.issuedCount}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono border-t border-white/10 pt-3">
                        <span className="font-bold text-[#808080] uppercase tracking-widest">Owner:</span>
                        <span className="text-white/80">{org.owner?.slice(0, 8)}...{org.owner?.slice(-6)}</span>
                        <CopyAddressButton address={org.owner} />
                        <ExplorerLink type="address" id={org.owner} />
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex items-center justify-between relative z-10 mt-auto">
                    {org.website ? (
                      <a href={org.website.startsWith('http') ? org.website : `https://${org.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#A0A0A0] hover:text-white transition-colors">
                        <Globe size={12} /> View Website
                      </a>
                    ) : (
                      <span className="text-[10px] text-[#555] uppercase tracking-widest font-bold">No Website</span>
                    )}
                    <ExplorerLink type="object" id={org.id} label="Ledger" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
