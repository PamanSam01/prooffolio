"use client";

import Link from "next/link";
import { ShieldCheck, Link2, CheckCircle2, Loader2, FileDigit, Code2, ExternalLink, Globe } from "lucide-react";
import { IconX, IconGitHub, IconLinkedIn } from "@/components/ui/SocialIcons";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { use, useState, useEffect } from "react";
import { CREDENTIAL_TYPE, USER_PROFILE_TYPE } from "@/lib/contracts";
import { ExplorerLink } from "@/components/ui/ExplorerLink";
import { WalrusLink } from "@/components/ui/WalrusLink";
import { ProoffolioLightfall } from "@/components/backgrounds/ProoffolioLightfall";

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [visibleCreds, setVisibleCreds] = useState(5);
  
  // Fetch User Profile
  const { data: profileData, isPending: profilePending } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: id,
      filter: { StructType: USER_PROFILE_TYPE },
      options: { showContent: true },
    },
    { enabled: !!id }
  );

  // Fetch Credentials
  const { data: credsData, isPending: credsPending } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: id,
      filter: { StructType: CREDENTIAL_TYPE },
      options: { showContent: true },
    },
    { enabled: !!id }
  );

  const profileObj = profileData?.data?.[0]?.data?.content as any;
  const profile = profileObj?.fields || null;
  const credentials = credsData?.data || [];
  
  const [v2Metadata, setV2Metadata] = useState<any>(null);

  useEffect(() => {
    if (profile?.bio && profile.bio.startsWith("v2|walrus:")) {
      const blobId = profile.bio.split(":")[1];
      fetch(`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`)
        .then(res => res.json())
        .then(data => setV2Metadata(data))
        .catch(console.error);
    }
  }, [profile?.bio]);

  let headline = "Professional";
  if (profile?.bio) {
    if (profile.bio.startsWith("v2|walrus:")) {
      headline = v2Metadata?.role || "Professional";
    } else if (profile.bio.includes("|")) {
      headline = profile.bio.split("|")[0];
    } else {
      headline = profile.bio;
    }
  }

  const socials = v2Metadata?.socials || {};

  const displayName = profile?.display_name || "Anonymous";
  const avatarBlob = profile?.avatar_blob_id;
  const resumeBlob = profile?.resume_blob_id;
  
  // Note: base_reputation exists on-chain for legacy compatibility.
  // verified_weight is the true proof-based reputation metric.
  const reputationScore = profile?.verified_weight || 0;
  
  const skills = profile?.skills || [];
  
  // Extract unique issuers from actual held credentials for accuracy
  const uniqueIssuersList = Array.from(new Set(credentials.map((c: any) => c.data?.content?.fields?.issuer).filter(Boolean))) as string[];

  const isPending = profilePending || credsPending;

  return (
    <div className="relative min-h-screen text-[#EDEDED] font-sans selection:bg-[#3ECF8E]/30 selection:text-[#EDEDED] pb-24 overflow-x-hidden">
      
      {/* Lightfall Ambient Background */}
      <div className="fixed inset-0 z-0 bg-[#050816]">
        <ProoffolioLightfall />
      </div>

      <div className="relative z-10">
      {/* Navigation */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-black/60 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-6 h-6 bg-[#3ECF8E] flex items-center justify-center rounded-sm">
            <span className="text-[#1c1c1c] font-bold text-xs">P</span>
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#EDEDED]">Prooffolio</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xs font-medium text-[#A0A0A0] hover:text-[#EDEDED] transition-colors">Return to Dashboard</Link>
        </nav>
      </header>

      <main className="w-full max-w-[1440px] 2xl:max-w-[1600px] mx-auto pt-16 px-4 sm:px-6 lg:px-8">
        
        <div className="bg-black/40 backdrop-blur-xl border border-[#00c2ff]/10 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
          {/* Subtle top glow inside the container */}
          <div className="absolute top-0 left-0 w-full h-[30%] bg-[radial-gradient(circle_at_top_center,rgba(0,194,255,0.1),transparent_70%)] pointer-events-none"></div>
          
          <div className="relative z-10">
            {/* Profile Header */}
        <div className="mb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-2xl border border-white/10 bg-[#151515] overflow-hidden shadow-xl flex-shrink-0 relative">
              {avatarBlob ? (
                <img src={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${avatarBlob}`} className="w-full h-full object-cover" alt="Avatar"/>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[#555] font-mono">NO_IMG</div>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1 text-[#EDEDED]">{displayName}</h1>
              <p className="text-sm text-white/55 font-bold uppercase tracking-widest mb-3">{headline}</p>
              
              {(socials.x || socials.github || socials.linkedin || socials.website) && (
                <div className="flex items-center gap-4 mb-4">
                  {socials.x && <a href={socials.x} target="_blank" rel="noreferrer" className="text-white/40 hover:text-[#00c2ff] transition-colors"><IconX size={16}/></a>}
                  {socials.github && <a href={socials.github} target="_blank" rel="noreferrer" className="text-white/40 hover:text-[#00c2ff] transition-colors"><IconGitHub size={16}/></a>}
                  {socials.linkedin && <a href={socials.linkedin} target="_blank" rel="noreferrer" className="text-white/40 hover:text-[#00c2ff] transition-colors"><IconLinkedIn size={16}/></a>}
                  {socials.website && <a href={socials.website} target="_blank" rel="noreferrer" className="text-white/40 hover:text-[#00c2ff] transition-colors"><Globe size={16}/></a>}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs font-mono text-[#A0A0A0]">
                <div className="flex items-center gap-2">
                  <span className="text-[#555]">WALLET</span> 
                  {id.slice(0, 8)}...{id.slice(-6)}
                  <ExplorerLink type="address" id={id} />
                </div>
                {profileData?.data?.[0]?.data?.objectId && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#555]">PASSPORT ID</span>
                    {profileData.data[0].data.objectId.slice(0,8)}...
                    <ExplorerLink type="object" id={profileData.data[0].data.objectId} />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {resumeBlob && (
              <WalrusLink blobId={resumeBlob} label="Verify Resume PDF" />
            )}
          </div>
        </div>

        {/* Recruiter Summary Grid */}
        {!isPending && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 border-y border-[#00c2ff]/10 py-8 relative z-10">
            <div>
              <div className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-widest mb-1">Reputation</div>
              <div className="text-2xl font-bold text-[#EDEDED]">{reputationScore} <span className="text-xs text-[#555] font-normal">WT</span></div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-widest mb-1">Credentials</div>
              <div className="text-2xl font-bold text-[#EDEDED]">{credentials.length}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-widest mb-1">Skills</div>
              <div className="text-2xl font-bold text-[#EDEDED]">{skills.length}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-widest mb-1">Issuers</div>
              <div className="text-2xl font-bold text-[#EDEDED]">{uniqueIssuersList.length}</div>
            </div>
          </div>
        )}

        {isPending ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-[#3ECF8E]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sidebar / Identity Block */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                <h2 className="text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-4">Indexed Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {skills.length > 0 ? (
                    <>
                      {skills.slice(0, 15).map((skill: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-mono text-[#A0A0A0] uppercase">
                          {skill}
                        </span>
                      ))}
                      {skills.length > 15 && (
                        <button className="px-3 py-1 bg-[#00c2ff]/10 border border-[#00c2ff]/30 text-[#00c2ff] rounded text-[10px] font-mono uppercase hover:bg-[#00c2ff]/20 transition-colors">
                          + {skills.length - 15} More
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-[#555] italic">No skills indexed yet.</span>
                  )}
                </div>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                <h2 className="text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-4">Verified Issuers</h2>
                <div className="space-y-3">
                  {uniqueIssuersList.length > 0 ? uniqueIssuersList.map((issuer: string, i: number) => (
                    <div className="flex items-center gap-3" key={i}>
                      <div className="w-6 h-6 rounded bg-[#2a2a2a] border border-white/10 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck size={12} className="text-[#3ECF8E]" />
                      </div>
                      <div className="text-xs font-mono text-[#A0A0A0] truncate">
                        {issuer.slice(0, 8)}...{issuer.slice(-6)}
                      </div>
                      <ExplorerLink type="address" id={issuer} />
                    </div>
                  )) : (
                    <span className="text-xs text-[#555] italic">No trusted issuers yet.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Main Feed: Credentials Ledger */}
            <div className="lg:col-span-2">
              <h2 className="text-xs font-bold text-[#A0A0A0] uppercase tracking-widest mb-6">Proof Ledger ({credentials.length})</h2>
              
              <div className="flex flex-col gap-6">
                {credentials.length === 0 ? (
                  <div className="text-sm text-[#A0A0A0] py-4">No verifiable credentials found.</div>
                ) : (
                  <>
                  <div className="relative border-l border-[#00c2ff]/20 pl-6 ml-3 space-y-8">
                    {credentials.slice(0, visibleCreds).map((cred: any, idx: number) => {
                      const fields = cred.data?.content?.fields;
                      const title = fields?.title || fields?.cred_type || "Unknown Credential";
                      const issuer = fields?.issuer || "0x...";
                      const weight = fields?.weight || 0;
                      const metadataBlob = fields?.metadata_blob_id;
                      const objId = cred.data?.objectId;
                      
                      return (
                        <div key={idx} className="relative">
                          <div className="absolute -left-[31px] top-6 w-3 h-3 rounded-full bg-[#1c1c1c] border-2 border-[#00c2ff] z-10 shadow-[0_0_10px_rgba(0,194,255,0.5)]"></div>
                          <div className="flex flex-col gap-2">
                            <div className="text-xs font-mono text-[#A0A0A0] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>OBJECT_ID: {objId.slice(0,10)}...{objId.slice(-4)}</span>
                              <ExplorerLink type="object" id={objId} />
                            </div>
                            <span className="text-[#3B82F6] font-bold">+{weight} WT</span>
                          </div>
                          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 relative group hover:border-[#3ECF8E]/50 hover:bg-white/10 transition-colors">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                              <div className="font-semibold text-[#EDEDED]">{title}</div>
                              <div className="flex items-center gap-1 text-[10px] font-mono text-[#3ECF8E] border border-[#3ECF8E]/30 bg-[#3ECF8E]/10 px-2 py-0.5 rounded">
                                <CheckCircle2 size={10} /> Valid
                              </div>
                            </div>
                            <div className="text-xs text-[#A0A0A0] mb-4 flex items-center gap-2">
                              Issued by: {issuer.slice(0,6)}...{issuer.slice(-4)}
                              <ExplorerLink type="address" id={issuer} />
                            </div>
                            <div className="flex gap-2">
                              {metadataBlob ? (
                                <WalrusLink blobId={metadataBlob} />
                              ) : (
                                <span className="text-xs font-mono bg-white/5 border border-white/10 px-2 py-1 text-[#555] rounded">No Metadata</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                  
                  {visibleCreds < credentials.length && (
                    <div className="pt-8 flex justify-center ml-3">
                      <button 
                        onClick={() => setVisibleCreds(prev => prev + 5)}
                        className="px-6 py-2 bg-white/5 border border-white/10 text-xs font-bold text-[#EDEDED] uppercase tracking-widest rounded hover:bg-white/10 transition-colors"
                      >
                        Load More Proofs
                      </button>
                    </div>
                  )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
