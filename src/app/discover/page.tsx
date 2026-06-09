"use client";

import { Database, Search, ShieldCheck, CheckCircle2, UserCircle2, ArrowRight, Loader2, X, FileText, Code2, Link2, FileDigit, Link as LinkIcon, Briefcase, Globe } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ProoffolioLightfall } from "@/components/backgrounds/ProoffolioLightfall";
import { useSuiClient } from "@mysten/dapp-kit";
import { PROFILE_CREATED_EVENT } from "@/lib/contracts";
import { IconX, IconGitHub, IconLinkedIn } from "@/components/ui/SocialIcons";
import { ExplorerLink } from "@/components/ui/ExplorerLink";
import { WalrusLink } from "@/components/ui/WalrusLink";
import QRCode from "react-qr-code";

// ----------------------------------------------------------------------
// Audit Log Component
// ----------------------------------------------------------------------
const AuditLogEntry = ({ text }: { text: string }) => (
  <div className="mb-4">
    <div className="text-[11px] font-mono text-[#A0A0A0] whitespace-pre-wrap leading-relaxed">
      {text}
    </div>
  </div>
);

// ----------------------------------------------------------------------
// Main Page
// ----------------------------------------------------------------------
export default function DiscoverPage() {
  const router = useRouter();
  const suiClient = useSuiClient();

  // Engine State
  const [candidateGraph, setCandidateGraph] = useState<any[]>([]);
  const [isBuildingGraph, setIsBuildingGraph] = useState(true);

  // Search State
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<string[]>([
    "[INFO] Initializing client-side deterministic indexer...",
    "[INFO] Connecting to live Sui network..."
  ]);

  // Modal State
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  // 1. Build In-Memory Graph on Load
  useEffect(() => {
    async function buildGraph() {
      setIsBuildingGraph(true);
      try {
        setAuditLog(prev => [...prev, "[SYNC] Fetching global profile creation events..."]);

        // Fetch all profile creation events
        const eventsResponse = await suiClient.queryEvents({
          query: { MoveEventType: PROFILE_CREATED_EVENT },
          order: "descending",
          limit: 50 // Limit for MVP scope
        });

        const profileIds = Array.from(new Set(eventsResponse.data.map(e => (e.parsedJson as any).profile_id)));

        if (profileIds.length === 0) {
          setAuditLog(prev => [...prev, "[SYNC] No profiles found on network."]);
          setIsBuildingGraph(false);
          return;
        }

        setAuditLog(prev => [...prev, `[SYNC] Hydrating ${profileIds.length} UserProfile objects...`]);

        // Hydrate Profile Objects
        const profileObjects = await suiClient.multiGetObjects({
          ids: profileIds,
          options: { showContent: true }
        });

        // Collect all credential IDs to fetch
        let allCredIds: string[] = [];
        profileObjects.forEach(p => {
          const fields = (p.data?.content as any)?.fields;
          if (fields?.synced_creds) allCredIds.push(...fields.synced_creds);
        });

        allCredIds = Array.from(new Set(allCredIds));

        setAuditLog(prev => [...prev, `[SYNC] Hydrating ${allCredIds.length} Credential objects...`]);

        // Fetch Credential Objects in chunks of 50
        const credChunks = [];
        for (let i = 0; i < allCredIds.length; i += 50) {
          credChunks.push(allCredIds.slice(i, i + 50));
        }

        const allCredObjects: any[] = [];
        for (const chunk of credChunks) {
          const res = await suiClient.multiGetObjects({ ids: chunk, options: { showContent: true } });
          allCredObjects.push(...res);
        }

        // Assemble In-Memory Graph
        setAuditLog(prev => [...prev, `[INDEX] Assembling deterministic graph...`]);

        const graph = await Promise.all(profileObjects.map(async p => {
          const fields = (p.data?.content as any)?.fields;
          if (!fields) return null;

          let headline = "Professional";
          let socials: any = {};

          if (fields.bio && fields.bio.startsWith("v2|walrus:")) {
            const blobId = fields.bio.split(":")[1];
            try {
              const res = await fetch(`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`);
              const data = await res.json();
              headline = data.role || "Professional";
              socials = data.socials || {};
            } catch (e) { }
          } else if (fields.bio && fields.bio.includes("|")) {
            headline = fields.bio.split("|")[0];
          } else {
            headline = fields.bio;
          }

          const myCredIds = fields.synced_creds || [];
          const myCreds = await Promise.all(allCredObjects
            .filter(c => myCredIds.includes(c.data?.objectId))
            .map(async c => {
              const cFields = (c.data?.content as any)?.fields;
              const metadataBlobId = cFields?.metadata_blob_id;
              let imageBlobId = null;
              if (metadataBlobId) {
                try {
                  const res = await fetch(`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${metadataBlobId}`);
                  const data = await res.json();
                  imageBlobId = data.image_blob_id || null;
                } catch (e) {}
              }
              return {
                id: c.data?.objectId,
                title: cFields?.title || "Unknown",
                issuer: cFields?.issuer || "Unknown",
                weight: parseInt(cFields?.weight || "0"),
                tags: cFields?.tags || [],
                metadataBlob: metadataBlobId,
                imageBlob: imageBlobId
              };
            }));

          // Note: base_reputation exists on-chain for legacy compatibility but is deliberately ignored here.
          // verified_weight is the true proof-based reputation metric used by the Ranking Engine.
          const repScore = parseInt(fields.verified_weight || "0");
          const uniqueIssuers = Array.from(new Set(myCreds.map(c => c.issuer)));

          return {
            profileId: p.data?.objectId,
            wallet: fields.owner,
            displayName: fields.display_name,
            headline,
            reputationScore: repScore,
            credentialCount: parseInt(fields.credential_count || "0"),
            skills: fields.skills || [],
            uniqueIssuers,
            avatarBlob: fields.avatar_blob_id,
            resumeBlob: fields.resume_blob_id,
            socials,
            credentials: myCreds
          };
        }));

        const cleanGraph = graph.filter(Boolean);
        setCandidateGraph(cleanGraph);
        setSearchResults(cleanGraph.map(c => ({ candidate: c, confidence: 100, matchType: "Network Default", matchedSkill: "All", rankingScore: 0 })));

        setAuditLog([
          "[READY] Graph assembled successfully.",
          `[INDEX] Tracking ${cleanGraph.length} candidates and ${allCredIds.length} credentials.`,
          "[INFO] Waiting for query execution..."
        ]);

        setIsBuildingGraph(false);
      } catch (e) {
        console.error("Failed to build graph", e);
        setAuditLog(prev => [...prev, "[ERROR] Critical failure during graph construction."]);
        setIsBuildingGraph(false);
      }
    }

    buildGraph();
  }, [suiClient]);

  // 2. Deterministic Search & Ranking Engine
  const executeQuery = () => {
    if (!query) {
      setSearchResults(candidateGraph.map(c => ({ candidate: c, confidence: 100, matchType: "Network Default", matchedSkill: "All", rankingScore: 0 })));
      setAuditLog(["[INFO] Global Network View.", `[INFO] Displaying ${candidateGraph.length} indexed candidates.`]);
      return;
    }

    const q = query.toLowerCase();
    const results: any[] = [];
    const log: string[] = [];

    log.push(`[QUERY]\nSearching for: ${query.toUpperCase()}`);

    candidateGraph.forEach(candidate => {
      let confidence = 0;
      let matchType = "";
      let matchedSkill = "";

      // 1. Exact Skill Match = 100%
      const exactSkill = candidate.skills.find((s: string) => s.toLowerCase() === q);
      if (exactSkill) {
        confidence = 100; matchType = "Indexed Skill"; matchedSkill = exactSkill;
      }

      // 2. Credential Title Match = 90%
      if (!matchType) {
        const credMatch = candidate.credentials.find((c: any) => c.title.toLowerCase().includes(q));
        if (credMatch) {
          confidence = 90; matchType = "Credential Title"; matchedSkill = credMatch.title;
        }
      }

      // 3. Issuer Match = 85%
      if (!matchType) {
        const issuerMatch = candidate.credentials.find((c: any) => c.issuer.toLowerCase().includes(q));
        if (issuerMatch) {
          confidence = 85; matchType = "Issuer Address"; matchedSkill = issuerMatch.issuer;
        }
      }

      // 4. Headline Match = 80%
      if (!matchType && candidate.headline.toLowerCase().includes(q)) {
        confidence = 80; matchType = "Headline"; matchedSkill = candidate.headline;
      }

      // 5. Fuzzy Text Match (Name) = 70%
      if (!matchType && candidate.displayName.toLowerCase().includes(q)) {
        confidence = 70; matchType = "Display Name"; matchedSkill = candidate.displayName;
      }

      // 6. Reputation Match
      if (!matchType && !isNaN(parseInt(q))) {
        if (candidate.reputationScore >= parseInt(q)) {
          confidence = 80; matchType = "Reputation Threshold"; matchedSkill = `>= ${q} WT`;
        }
      }

      if (matchType) {
        // Deterministic Ranking Score
        const rankingScore = (candidate.reputationScore * 0.60) + (candidate.uniqueIssuers.length * 0.25) + (candidate.credentialCount * 0.15);
        results.push({
          candidate,
          confidence,
          matchType,
          matchedSkill,
          rankingScore
        });
      }
    });

    // Rank deterministically
    results.sort((a, b) => b.rankingScore - a.rankingScore);

    log.push(`[MATCH]\nFound ${results.length} candidates.`);

    if (results.length > 0) {
      log.push(`[FILTER]\nMatched via ${results[0].matchType.toLowerCase()}: ${results[0].matchedSkill}`);
      log.push(`[RANKING]\nSorting by:\n1. Reputation Weight\n2. Issuer Diversity\n3. Credential Count`);

      const top = results[0];
      log.push(`[RESULT]\nCandidate:\n${top.candidate.displayName}\n\nReason:\n* Match: ${top.matchType} (${top.matchedSkill})\n* Reputation Weight: ${top.candidate.reputationScore} WT\n* Unique Issuers: ${top.candidate.uniqueIssuers.length}\n* Credentials: ${top.candidate.credentialCount}\n\nConfidence:\n${top.confidence}%`);
    } else {
      log.push(`[RESULT]\nNo candidates found matching parameters.`);
    }

    setSearchResults(results);
    setAuditLog(log);
  };

  return (
    <div className="relative min-h-screen font-sans selection:bg-[#3B82F6]/30 selection:text-white pb-24 overflow-x-hidden bg-[#050816]">
      
      {/* Ambient Background Orbs */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#3B82F6]/10 blur-[150px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#3ECF8E]/5 blur-[120px] pointer-events-none z-0"></div>

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
              <Database size={14} /> Deterministic Search Engine
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">Query the Network.</h1>
            <p className="text-[#808080] text-sm leading-relaxed mb-8">
              Perform queries against our in-memory client-side indexer. Candidates are filtered by live on-chain credentials and ranked deterministically by reputation weight and issuer diversity.
            </p>

            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#555] group-focus-within:text-[#3B82F6] transition-colors" size={20} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && executeQuery()}
                placeholder="Search by skill, credential, issuer, or reputation..."
                disabled={isBuildingGraph}
                className="w-full bg-black/40 backdrop-blur-xl border border-white/10 text-white text-sm font-mono rounded-2xl pl-14 pr-36 py-5 focus:outline-none focus:border-[#3B82F6] transition-colors disabled:opacity-50 shadow-2xl"
              />
              <button
                onClick={executeQuery}
                disabled={isBuildingGraph}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white text-black hover:bg-gray-200 transition-colors text-xs font-bold px-5 py-2.5 rounded-xl disabled:opacity-50 shadow-lg"
              >
                Execute Query
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Results Table */}
            <div className="lg:col-span-2">
              <h2 className="text-[10px] font-bold text-[#808080] uppercase tracking-widest mb-4 flex items-center gap-2">
                Network Results <span className="bg-[#3B82F6]/20 text-[#3B82F6] px-2 py-0.5 rounded text-[9px] border border-[#3B82F6]/30">{searchResults.length}</span>
              </h2>

              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="hidden md:grid grid-cols-12 gap-4 p-5 border-b border-white/5 text-[9px] uppercase font-bold text-[#808080] bg-white/5 tracking-widest">
                  <div className="col-span-6">Identity</div>
                  <div className="col-span-4 text-center">Rank Metrics</div>
                  <div className="col-span-2 text-right">Action</div>
                </div>

                <div className="divide-y divide-white/5">
                  {isBuildingGraph ? (
                    <div className="px-4 py-20 text-center">
                      <div className="relative inline-block mb-4">
                        <div className="absolute inset-0 bg-[#3ECF8E] blur-[20px] opacity-20 rounded-full"></div>
                        <Loader2 className="w-10 h-10 animate-spin text-[#3ECF8E] relative z-10 mx-auto" />
                      </div>
                      <div className="text-[10px] text-[#A0A0A0] font-mono animate-pulse uppercase tracking-widest">Syncing on-chain ledger...</div>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-4 py-20 text-center text-[#808080] text-sm">
                      <Database size={48} className="text-[#333] mx-auto mb-4" />
                      <div className="font-bold mb-1">No Results Found</div>
                      <div className="text-xs font-mono">Try adjusting your query parameters.</div>
                    </div>
                  ) : (
                    searchResults.map((result, i) => (
                      <div key={i} className="flex flex-col md:grid md:grid-cols-12 gap-4 p-5 md:items-center hover:bg-white/5 transition-colors group relative">
                        <div className="md:col-span-6 flex items-center gap-4">
                          <div className="w-12 h-12 bg-black rounded-xl border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg relative">
                            {result.candidate.avatarBlob ? (
                              <img src={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${result.candidate.avatarBlob}`} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt="Avatar" />
                            ) : (
                              <UserCircle2 size={24} className="text-[#555]" />
                            )}
                          </div>
                          <div className="overflow-hidden pr-12 md:pr-0">
                            <div className="font-bold text-white text-sm truncate mb-0.5 group-hover:text-[#3B82F6] transition-colors">{result.candidate.displayName}</div>
                            <div className="text-[10px] text-[#808080] font-bold uppercase tracking-widest truncate">{result.candidate.headline}</div>
                            <div className="text-[9px] font-mono text-[#555] mt-1">{result.candidate.skills.slice(0, 2).join(", ")}{result.candidate.skills.length > 2 && "..."}</div>
                          </div>
                        </div>

                        <div className="md:col-span-4 flex flex-col md:items-center justify-center mt-4 md:mt-0">
                          <div className="flex items-center gap-4 mb-2">
                            <div className="flex flex-col md:items-center">
                              <span className="text-[9px] text-[#555] uppercase tracking-widest font-bold">Rep</span>
                              <div className="flex items-center gap-1 font-mono font-bold text-[#3ECF8E]">{result.candidate.reputationScore}</div>
                            </div>
                            <div className="w-px h-6 bg-white/10"></div>
                            <div className="flex flex-col md:items-center">
                              <span className="text-[9px] text-[#555] uppercase tracking-widest font-bold">Creds</span>
                              <div className="flex items-center gap-1 font-mono font-bold text-white">{result.candidate.credentialCount}</div>
                            </div>
                          </div>
                          <div className="self-start md:self-auto">
                            {result.confidence < 100 ? (
                              <div className="inline-block text-[9px] font-bold text-[#3B82F6] bg-[#3B82F6]/10 border border-[#3B82F6]/20 px-2.5 py-0.5 rounded-full truncate uppercase tracking-widest">
                                {result.confidence}% {result.matchType}
                              </div>
                            ) : (
                              <div className="inline-block text-[9px] font-bold text-[#3ECF8E] bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 px-2.5 py-0.5 rounded-full truncate uppercase tracking-widest">
                                100% {result.matchType}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="md:col-span-2 md:text-right absolute top-5 right-5 md:relative md:top-0 md:right-0">
                          <button
                            onClick={() => setSelectedProfile(result.candidate)}
                            className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center ml-auto group-hover:border-[#3B82F6] group-hover:bg-[#3B82F6]/10 transition-colors"
                          >
                            <ArrowRight size={16} className="text-[#808080] group-hover:text-[#3B82F6] transition-colors" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Audit Log */}
            <div className="lg:col-span-1">
              <h2 className="text-[10px] font-bold text-[#808080] uppercase tracking-widest mb-4">Query Execution Log</h2>

              <div className="bg-[#050816] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px] sticky top-24">
                <div className="bg-black/80 border-b border-white/10 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                  </div>
                  <div className="text-[9px] font-mono text-[#555] uppercase tracking-widest">query_engine.sh</div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar text-[11px]">
                  {auditLog.map((log, i) => (
                    <AuditLogEntry key={i} text={log} />
                  ))}
                  <div className="animate-pulse w-2 h-4 bg-[#3B82F6] mt-2 inline-block"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* PROFILE MODAL (Reusing public profile layout inside a structured container) */}
      {/* ------------------------------------------------------------------ */}
      {selectedProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm overflow-hidden">
          <div className="bg-[#0A0A0A] border border-[#00c2ff]/20 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-[30%] bg-[radial-gradient(circle_at_top_center,rgba(0,194,255,0.1),transparent_70%)] pointer-events-none"></div>

            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between relative z-10 bg-[#0A0A0A]">
              <div className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#3ECF8E]" /> Candidate Profile
              </div>
              <button onClick={() => setSelectedProfile(null)} className="text-[#A0A0A0] hover:text-white p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 relative z-10">
              
              {/* Section 1: Header */}
              <div className="mb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 w-full overflow-hidden">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border border-white/10 bg-[#151515] overflow-hidden shadow-xl flex-shrink-0 relative">
                    {selectedProfile.avatarBlob ? (
                      <img src={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${selectedProfile.avatarBlob}`} className="w-full h-full object-cover" alt="Avatar" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] md:text-xs text-[#555] font-mono">NO_IMG</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 text-[#EDEDED] truncate">{selectedProfile.displayName}</h1>
                    <p className="text-xs md:text-sm text-white/55 font-bold uppercase tracking-widest mb-3 truncate">{selectedProfile.headline}</p>

                    {(selectedProfile.socials.x || selectedProfile.socials.github || selectedProfile.socials.linkedin || selectedProfile.socials.website) && (
                      <div className="flex items-center gap-4 mb-4">
                        {selectedProfile.socials.x && <a href={selectedProfile.socials.x} target="_blank" rel="noreferrer" className="text-white/40 hover:text-[#00c2ff] transition-colors"><IconX size={16} /></a>}
                        {selectedProfile.socials.github && <a href={selectedProfile.socials.github} target="_blank" rel="noreferrer" className="text-white/40 hover:text-[#00c2ff] transition-colors"><IconGitHub size={16} /></a>}
                        {selectedProfile.socials.linkedin && <a href={selectedProfile.socials.linkedin} target="_blank" rel="noreferrer" className="text-white/40 hover:text-[#00c2ff] transition-colors"><IconLinkedIn size={16} /></a>}
                        {selectedProfile.socials.website && <a href={selectedProfile.socials.website} target="_blank" rel="noreferrer" className="text-white/40 hover:text-[#00c2ff] transition-colors"><Globe size={16} /></a>}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-4 text-[10px] md:text-xs font-mono text-[#A0A0A0]">
                      <div className="flex items-center gap-2">
                        <span className="text-[#555]">WALLET</span>
                        {selectedProfile.wallet.slice(0, 6)}...{selectedProfile.wallet.slice(-4)}
                        <ExplorerLink type="address" id={selectedProfile.wallet} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#555]">ID</span>
                        {selectedProfile.profileId.slice(0, 6)}...{selectedProfile.profileId.slice(-4)}
                        <ExplorerLink type="object" id={selectedProfile.profileId} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-[#151515] border border-white/5 p-2 rounded-xl flex-shrink-0 mt-2 md:mt-0">
                  {selectedProfile.resumeBlob && (
                    <WalrusLink blobId={selectedProfile.resumeBlob} label="Verify Resume PDF" />
                  )}
                  <div className="bg-white p-1 rounded hover:scale-150 transition-transform origin-top-right cursor-crosshair relative group">
                    <QRCode 
                      value={typeof window !== 'undefined' ? `${window.location.origin}/profile/${selectedProfile.wallet}` : `https://prooffolio.com/profile/${selectedProfile.wallet}`} 
                      size={32} 
                    />
                    <div className="absolute top-full right-0 mt-2 whitespace-nowrap bg-black text-[#A0A0A0] text-[10px] px-2 py-1 rounded border border-white/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      Scan Public Passport
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 border-y border-[#00c2ff]/10 py-6 relative z-10">
                <div>
                  <div className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-widest mb-1">Reputation</div>
                  <div className="text-2xl font-bold text-[#EDEDED]">{selectedProfile.reputationScore} <span className="text-xs text-[#555] font-normal">WT</span></div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-widest mb-1">Credentials</div>
                  <div className="text-2xl font-bold text-[#EDEDED]">{selectedProfile.credentialCount}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-widest mb-1">Skills</div>
                  <div className="text-2xl font-bold text-[#EDEDED]">{selectedProfile.skills.length}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-widest mb-1">Issuers</div>
                  <div className="text-2xl font-bold text-[#EDEDED]">{selectedProfile.uniqueIssuers.length}</div>
                </div>
              </div>

              {/* Section 3: Ledger */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sidebar */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                    <h2 className="text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-4">Indexed Skills</h2>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.skills.map((skill: string, i: number) => (
                        <div key={i} className="px-3 py-1.5 bg-[#151515] border border-white/10 rounded-lg text-xs font-mono font-medium text-white/80">
                          {skill}
                        </div>
                      ))}
                      {selectedProfile.skills.length === 0 && <div className="text-xs text-[#555] italic">No skills indexed.</div>}
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                    <h2 className="text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-4 flex items-center gap-2">
                      <ShieldCheck size={14} className="text-[#3ECF8E]" /> Verified Issuers
                    </h2>
                    <div className="flex flex-col gap-3">
                      {selectedProfile.uniqueIssuers.map((issuer: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 bg-[#151515] p-3 rounded-xl border border-white/5">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                            <Briefcase size={12} className="text-[#A0A0A0]" />
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-[#EDEDED] truncate">Institutional Node</div>
                            <div className="text-[10px] font-mono text-[#A0A0A0] flex items-center gap-1 mt-0.5">
                              {issuer.slice(0, 6)}...{issuer.slice(-4)}
                              <ExplorerLink type="address" id={issuer} />
                            </div>
                          </div>
                        </div>
                      ))}
                      {selectedProfile.uniqueIssuers.length === 0 && <div className="text-xs text-[#555] italic">No issuers found.</div>}
                    </div>
                  </div>
                </div>

                {/* Timeline Ledger */}
                <div className="lg:col-span-2">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-6 md:p-8">
                    <h2 className="text-sm font-bold text-[#EDEDED] mb-6 flex items-center gap-2">
                      <Link2 size={16} className="text-[#3B82F6]" /> Proof Ledger
                    </h2>

                    {selectedProfile.credentials.length === 0 ? (
                      <div className="relative pl-4 border-l-2 border-[#1c1c1c] ml-2 space-y-8 opacity-70">
                        <div className="relative">
                          <div className="absolute -left-[23px] top-6 w-3 h-3 rounded-full bg-[#1c1c1c] border-2 border-[#555] z-10 shadow-[0_0_10px_rgba(255,255,255,0.1)]"></div>
                          <div className="flex flex-col gap-2">
                            <div className="text-xs font-mono text-[#A0A0A0] flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[#555]">MOCK_PREVIEW (NOT ON-CHAIN)</span>
                              </div>
                              <span className="text-[#555] font-bold">+100 WT</span>
                            </div>
                            <div className="flex-1 bg-white/5 border border-dashed border-white/20 rounded-2xl p-6 relative">
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                <div className="font-semibold text-[#EDEDED]">Senior Blockchain Engineer (Mock)</div>
                                <div className="flex items-center gap-1 text-[10px] font-mono text-[#555] border border-white/10 bg-white/5 px-2 py-0.5 rounded">
                                  <Code2 size={10} /> Demo Mode
                                </div>
                              </div>
                              <div className="text-xs text-[#A0A0A0] mb-4 flex items-center gap-2">
                                Issued by: Example Corporation
                              </div>
                              <div className="mt-4 rounded-xl overflow-hidden border border-white/10 h-[100px] bg-[#151515] flex items-center justify-center relative">
                                <div className="text-xs font-mono text-[#555]">Mock Certificate Image Placeholder</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative pl-4 border-l-2 border-[#1c1c1c] ml-2 space-y-8">
                        {selectedProfile.credentials.map((cred: any, idx: number) => (
                          <div key={idx} className="relative">
                            <div className="absolute -left-[23px] top-6 w-3 h-3 rounded-full bg-[#1c1c1c] border-2 border-[#00c2ff] z-10 shadow-[0_0_10px_rgba(0,194,255,0.5)]"></div>
                            <div className="flex flex-col gap-2">
                              <div className="text-xs font-mono text-[#A0A0A0] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span>OBJECT_ID: {cred.id.slice(0, 10)}...{cred.id.slice(-4)}</span>
                                  <ExplorerLink type="object" id={cred.id} />
                                </div>
                                <span className="text-[#3B82F6] font-bold">+{cred.weight} WT</span>
                              </div>
                              <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 relative group hover:border-[#3ECF8E]/50 hover:bg-white/10 transition-colors">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                  <div className="font-semibold text-[#EDEDED]">{cred.title}</div>
                                  <div className="flex items-center gap-1 text-[10px] font-mono text-[#3ECF8E] border border-[#3ECF8E]/30 bg-[#3ECF8E]/10 px-2 py-0.5 rounded">
                                    <CheckCircle2 size={10} /> Valid
                                  </div>
                                </div>
                                <div className="text-xs text-[#A0A0A0] mb-4 flex items-center gap-2">
                                  Issued by: {cred.issuer.slice(0, 6)}...{cred.issuer.slice(-4)}
                                  <ExplorerLink type="address" id={cred.issuer} />
                                </div>
                                <div className="flex gap-2">
                                  {cred.imageBlob ? (
                                    <div className="w-full">
                                      {cred.metadataBlob && <WalrusLink blobId={cred.metadataBlob} label="View JSON Metadata" />}
                                      <div className="mt-4 rounded-xl overflow-hidden border border-white/10 max-h-[200px] bg-[#151515]">
                                        <img 
                                          src={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${cred.imageBlob}`} 
                                          className="w-full h-full object-cover" 
                                          alt="Certificate Preview" 
                                          onError={(e) => { e.currentTarget.style.display = 'none' }} 
                                        />
                                      </div>
                                    </div>
                                  ) : cred.metadataBlob ? (
                                    <WalrusLink blobId={cred.metadataBlob} label="View JSON Metadata" />
                                  ) : (
                                    <span className="text-xs font-mono bg-white/5 border border-white/10 px-2 py-1 text-[#555] rounded">No Metadata</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
