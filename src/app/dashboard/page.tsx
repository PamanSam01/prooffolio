"use client";

import { Activity, ShieldCheck, CheckCircle2, Link2, FileDigit, Loader2, Zap, Trophy, History, BadgeCheck, Building2 } from "lucide-react";
import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { CREDENTIAL_TYPE, USER_PROFILE_TYPE } from "@/lib/contracts";
import Link from "next/link";

const ActivityItem = ({ title, desc, meta, isPositive, objId }: { title: string, desc: string, meta: string, isPositive?: boolean, objId?: string }) => (
  <div className="relative pl-6 pb-6 last:pb-0 group">
    {/* Timeline Line */}
    <div className="absolute left-[11px] top-5 bottom-[-10px] w-px bg-gradient-to-b from-white/10 to-transparent group-last:hidden"></div>
    
    {/* Timeline Node */}
    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-black border border-white/10 flex items-center justify-center z-10 group-hover:border-[#3ECF8E] transition-colors shadow-[0_0_10px_rgba(0,0,0,0.5)]">
      <div className={`w-2 h-2 rounded-full ${isPositive ? 'bg-[#3ECF8E] shadow-[0_0_8px_#3ECF8E]' : 'bg-white/20'}`}></div>
    </div>

    <div className="bg-white/5 border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-bold text-white mb-1 tracking-wide">{title}</div>
          <div className="text-[11px] text-[#808080] font-mono mb-2">{desc}</div>
          {objId && (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 border border-white/5 text-[9px] font-mono text-[#555]">
              <FileDigit size={10} className="text-[#3B82F6]" /> {objId}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end">
          <div className="text-[10px] text-[#555] font-mono">{meta}</div>
          {isPositive && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#3ECF8E]/10 border border-[#3ECF8E]/20">
              <ShieldCheck size={10} className="text-[#3ECF8E]" />
              <span className="text-[9px] text-[#3ECF8E] font-bold tracking-widest uppercase">Verified</span>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
  const currentAccount = useCurrentAccount();

  const { data: credsData, isPending } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: currentAccount?.address as string,
      filter: { StructType: CREDENTIAL_TYPE },
      options: { showContent: true },
    },
    { enabled: !!currentAccount }
  );

  const { data: profileQuery } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: currentAccount?.address as string,
      filter: { StructType: USER_PROFILE_TYPE },
      options: { showContent: true },
    },
    { enabled: !!currentAccount }
  );

  const profileData = profileQuery?.data?.[0]?.data?.content?.dataType === "moveObject" 
    ? profileQuery.data[0].data.content.fields as any 
    : null;

  const credentials = credsData?.data || [];
  
  // Real Reputation calculations
  const verifiedWeight = profileData ? parseInt(profileData.verified_weight || "0") : 0;
  const uniqueIssuers = profileData?.unique_issuers ? profileData.unique_issuers.length : 0;
  const proofStrengthRaw = verifiedWeight > 500 ? "EXCEPTIONAL" : verifiedWeight > 100 ? "HIGH" : verifiedWeight > 0 ? "VERIFIED" : "NEW";

  return (
    <div className="w-full max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">Identity Command Center</h1>
          <p className="text-sm text-[#808080]">Manage your decentralized professional identity and verifiable proofs.</p>
        </div>
        {currentAccount && (
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-[#A0A0A0] bg-white/5 border border-white/10 px-3 py-1.5 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3ECF8E] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3ECF8E]"></span>
            </span>
            zkLogin Active
          </div>
        )}
      </div>

      {!currentAccount ? (
        <div className="p-16 text-center border border-white/5 rounded-2xl bg-black/20 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#3ECF8E]/5 blur-[80px] rounded-full"></div>
          <ShieldCheck size={56} className="text-[#3ECF8E]/50 mx-auto mb-6 relative z-10" />
          <h2 className="text-2xl font-bold text-white mb-3 relative z-10">Connect Your Wallet</h2>
          <p className="text-sm text-[#808080] max-w-md mx-auto relative z-10">Connect your Sui wallet to authenticate and view your on-chain identity dashboard.</p>
        </div>
      ) : isPending ? (
        <div className="flex justify-center p-20">
          <div className="relative">
            <div className="absolute inset-0 bg-[#3ECF8E] blur-[20px] opacity-20 rounded-full"></div>
            <Loader2 className="w-10 h-10 animate-spin text-[#3ECF8E] relative z-10" />
          </div>
        </div>
      ) : (
        <>
          {/* Hero KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            
            {/* Reputation Hero */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 hover:border-[#3ECF8E]/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden group transition-all duration-500">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Trophy size={64} className="text-[#3ECF8E]" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-[#3ECF8E]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#808080] mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] shadow-[0_0_5px_#3ECF8E]"></div> Reputation Weight
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-5xl font-extrabold text-white tracking-tight">{verifiedWeight}</div>
                  <div className="text-sm font-bold text-[#3ECF8E]">WT</div>
                </div>
                <div className="text-[10px] font-mono text-[#555] uppercase tracking-wider">Derived entirely from proofs</div>
              </div>
            </div>

            {/* Trust Level */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 hover:border-[#3B82F6]/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden group transition-all duration-500">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShieldCheck size={64} className="text-[#3B82F6]" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-[#3B82F6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#808080] mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_5px_#3B82F6]"></div> Trust Level
                </div>
                <div className={`text-2xl font-extrabold tracking-tight mb-3 mt-4 ${proofStrengthRaw === 'NEW' ? 'text-white' : 'text-[#3B82F6] drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]'}`}>
                  {proofStrengthRaw}
                </div>
                <div className="text-[10px] font-mono text-[#555] uppercase tracking-wider">Network Confidence</div>
              </div>
            </div>

            {/* Credentials Synced */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all duration-500">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#808080] mb-4 flex items-center gap-2">
                <BadgeCheck size={12} className="text-[#A0A0A0]" /> Proof Artifacts
              </div>
              <div className="text-4xl font-extrabold text-white mb-2">{credentials.length}</div>
              <div className="text-[10px] font-mono text-[#555] uppercase tracking-wider">Stored on Walrus</div>
            </div>

            {/* Active Issuers */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all duration-500">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#808080] mb-4 flex items-center gap-2">
                <Building2 size={12} className="text-[#A0A0A0]" /> Unique Issuers
              </div>
              <div className="text-4xl font-extrabold text-white mb-2">{uniqueIssuers}</div>
              <Link href="/organizations" className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold uppercase tracking-widest text-[#3B82F6] hover:text-white transition-colors">
                View Directory <Link2 size={10} />
              </Link>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#808080] mb-6">
                <History size={14} /> Immutable Activity Log
              </div>
              
              <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl">
                {credentials.length > 0 ? (
                  credentials.map((cred: any, idx: number) => {
                    const fields = cred.data?.content?.fields;
                    const issuer = fields?.issuer || "0x...";
                    const title = fields?.cred_type || "Credential";
                    const objId = cred.data?.objectId;
                    return (
                      <ActivityItem 
                        key={idx}
                        title={title} 
                        desc={`Issued by ${issuer.slice(0,8)}...${issuer.slice(-6)}`} 
                        meta="Indexed via RPC" 
                        isPositive 
                        objId={objId}
                      />
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <History size={32} className="text-[#333] mx-auto mb-4" />
                    <div className="text-sm font-bold text-[#808080]">No Genesis Events Found</div>
                    <div className="text-xs text-[#555] mt-1 font-mono">Awaiting your first credential sync.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#808080] mb-6">
                <Zap size={14} /> System Status
              </div>
              <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-2xl p-8 text-center shadow-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-b from-[#3ECF8E]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-16 h-16 rounded-full bg-black border border-white/10 flex items-center justify-center mx-auto mb-4 relative z-10 shadow-lg">
                  <CheckCircle2 size={24} className="text-[#3ECF8E]" />
                </div>
                <div className="text-sm font-bold text-white mb-1 relative z-10">Systems Operational</div>
                <div className="text-[10px] text-[#555] font-mono relative z-10">Sui Testnet connected. Zero pending verifications.</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
