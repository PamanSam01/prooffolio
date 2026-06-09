"use client";

import { useMemo } from "react";
import { BarChart3, Users, Network, TrendingUp, ShieldCheck, Activity, Loader2 } from "lucide-react";
import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";

export default function AnalyticsPage() {
  const currentAccount = useCurrentAccount();

  // Query all events emitted by the current user
  const { data: eventsData, isPending } = useSuiClientQuery(
    "queryEvents",
    {
      query: { Sender: currentAccount?.address as string },
      limit: 100,
    },
    {
      enabled: !!currentAccount,
      refetchInterval: 10000, // Poll every 10s for real-time feel
    }
  );

  const stats = useMemo(() => {
    if (!eventsData?.data) {
      return {
        credentialsIssued: 0,
        reputationDistributed: 0,
        activeHolders: 0,
        topSkills: "--",
        orgReach: 0,
      };
    }

    // Filter only CredentialIssued events
    const issuedEvents = eventsData.data.filter((e) => e.type.includes("CredentialIssued"));

    const credentialsIssued = issuedEvents.length;
    let reputationDistributed = 0;
    const uniqueRecipients = new Set<string>();
    const tagCounts: Record<string, number> = {};

    issuedEvents.forEach((e) => {
      const parsed = e.parsedJson as any;
      if (parsed) {
        // Accumulate Reputation
        reputationDistributed += Number(parsed.weight || 0);

        // Track Unique Holders
        if (parsed.recipient) {
          uniqueRecipients.add(parsed.recipient);
        }

        // Count Tags
        if (Array.isArray(parsed.tags)) {
          parsed.tags.forEach((tag: string) => {
            const t = tag.trim().toUpperCase();
            if (t) {
              tagCounts[t] = (tagCounts[t] || 0) + 1;
            }
          });
        }
      }
    });

    // Calculate Top Skills
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);
    
    const topSkills = sortedTags.length > 0 ? sortedTags.join(", ") : "--";

    return {
      credentialsIssued,
      reputationDistributed,
      activeHolders: uniqueRecipients.size,
      topSkills,
      orgReach: uniqueRecipients.size, // For MVP, Reach = Active Holders
    };
  }, [eventsData]);

  const metrics = [
    { label: "Credentials Issued", value: stats.credentialsIssued.toString(), icon: ShieldCheck },
    { label: "Reputation Distributed", value: stats.reputationDistributed.toString(), icon: TrendingUp },
    { label: "Active Holders", value: stats.activeHolders.toString(), icon: Users },
    { label: "Top Skills", value: stats.topSkills, icon: Activity },
    { label: "Organization Reach", value: stats.orgReach.toString(), icon: Network },
  ];

  return (
    <div className="w-full max-w-[1440px] 2xl:max-w-[1600px] mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
          <BarChart3 className="text-[#3B82F6]" /> Organization Analytics
        </h1>
        <p className="text-[#A0A0A0] text-sm">Measure your protocol impact and credential distribution in real-time.</p>
      </div>

      {!currentAccount ? (
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center shadow-xl">
          <p className="text-[#A0A0A0] text-sm">Please connect your wallet to view organization analytics.</p>
        </div>
      ) : isPending ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh]">
          <Loader2 size={32} className="animate-spin text-[#3B82F6] mb-4" />
          <p className="text-[#808080] text-sm animate-pulse">Syncing on-chain metrics...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {metrics.map((m, i) => (
            <div key={i} className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col shadow-xl hover:border-[#3B82F6]/30 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-[#808080] uppercase tracking-wider">{m.label}</span>
                <m.icon size={16} className="text-[#3B82F6]" />
              </div>
              <div className="text-3xl font-bold text-white mb-1 font-mono">{m.value}</div>
              <div className="text-[10px] text-[#3ECF8E] uppercase font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] animate-pulse"></span>
                Live from Sui
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
