"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, Link2, CheckCircle2, ChevronRight, Fingerprint, Database, Award, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { ProoffolioLightfall } from "@/components/backgrounds/ProoffolioLightfall";
import { AuthButton } from "@/components/AuthButton";

// --- Components ---

const ResumeMock = () => (
  <div className="w-full bg-[#2a2a2a] border border-[#3e3e3e] rounded p-6 shadow-sm grayscale opacity-50 relative">
    <div className="absolute inset-0 bg-[#1c1c1c]/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
      <span className="text-red-400 font-mono text-xs uppercase tracking-widest font-bold bg-[#2a2a2a] px-3 py-1 rounded border border-red-900/50">Unverified Source</span>
    </div>
    <div className="w-1/3 h-4 bg-[#3e3e3e] rounded mb-6" />
    <div className="space-y-3">
      <div className="w-full h-2 bg-[#3e3e3e] rounded" />
      <div className="w-5/6 h-2 bg-[#3e3e3e] rounded" />
      <div className="w-4/6 h-2 bg-[#3e3e3e] rounded" />
    </div>
    <div className="mt-6 flex flex-wrap gap-2">
      <div className="text-[10px] text-[#A0A0A0] font-mono border border-[#3e3e3e] px-2 py-0.5 rounded">PDF (Editable)</div>
      <div className="text-[10px] text-[#A0A0A0] font-mono border border-[#3e3e3e] px-2 py-0.5 rounded">No Signature</div>
    </div>
  </div>
);

const CredentialPassport = ({ issuer, title, date, hash }: { issuer: string, title: string, date: string, hash: string }) => (
  <div className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded p-0 shadow-xl relative overflow-hidden group hover:border-[#3ECF8E] transition-colors">
    {/* Top Bar: Hash */}
    <div className="bg-[#2a2a2a] border-b border-[#3e3e3e] px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <ShieldCheck size={14} className="text-[#3ECF8E]" />
        <span className="text-[10px] font-mono text-[#3ECF8E] uppercase tracking-wider">Cryptographically Signed</span>
      </div>
      <span className="text-[10px] font-mono text-[#A0A0A0]">{hash}</span>
    </div>
    {/* Body */}
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div className="text-xs font-bold tracking-widest text-[#A0A0A0] uppercase">{issuer}</div>
        {/* Watermark / Stamp */}
        <div className="border border-[#3ECF8E]/30 text-[#3ECF8E] text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded rotate-[-5deg]">
          Verified
        </div>
      </div>
      <h3 className="text-xl font-bold text-[#EDEDED] mb-2">{title}</h3>
      <div className="flex items-center gap-4 text-xs font-mono text-[#A0A0A0]">
        <span>Issued: {date}</span>
        <span className="flex items-center gap-1 hover:text-[#EDEDED] cursor-pointer transition-colors"><Link2 size={12}/> View on Sui</span>
      </div>
    </div>
  </div>
);

const FlowCard = ({ title, subtitle, icon: Icon, details }: { title: string, subtitle: string, icon: any, details: string[] }) => (
  <div className="group relative bg-[#1c1c1c] border border-[#3e3e3e] hover:border-[#00c2ff]/50 rounded-2xl p-6 transition-all duration-300 overflow-hidden flex flex-col h-[280px]">
    <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_top_right,rgba(0,194,255,0.1),transparent_70%)] pointer-events-none"></div>
    
    <div className="w-12 h-12 bg-[#2a2a2a] border border-[#3e3e3e] rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#00c2ff]/10 group-hover:border-[#00c2ff]/30 transition-colors">
      <Icon className="text-[#A0A0A0] group-hover:text-[#00c2ff] transition-colors" size={24} />
    </div>
    
    <h3 className="text-xl font-bold text-[#EDEDED] mb-2">{title}</h3>
    <p className="text-sm text-[#A0A0A0] leading-relaxed flex-1">{subtitle}</p>

    {/* Expandable Panel inside the card */}
    <div className="absolute inset-x-0 bottom-0 bg-[#0c0c0c]/95 backdrop-blur-xl border-t border-[#00c2ff]/30 p-6 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300">
      <div className="text-[10px] uppercase tracking-widest text-[#00c2ff] font-bold mb-3">Under The Hood</div>
      <ul className="space-y-2">
        {details.map((detail, idx) => (
          <li key={idx} className="flex items-center gap-2 text-xs text-[#EDEDED] font-mono">
            <ChevronRight size={12} className="text-[#3e3e3e]"/> {detail}
          </li>
        ))}
      </ul>
    </div>
  </div>
);

// --- Page ---

export default function LandingPage() {
  const currentAccount = useCurrentAccount();

  return (
    <div className="relative min-h-screen text-[#EDEDED] font-sans selection:bg-[#3ECF8E]/30 selection:text-[#EDEDED] overflow-x-hidden">
      
      {/* Lightfall Ambient Background */}
      <div className="fixed inset-0 z-0 bg-[#050816]">
        <ProoffolioLightfall />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <header className="px-4 md:px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <img src="/logo.png" alt="Prooffolio Logo" className="w-10 h-10 md:w-16 md:h-16 object-contain" />
            <span className="font-semibold text-lg md:text-xl tracking-tight text-[#EDEDED]">Prooffolio</span>
          </div>
          <nav className="flex items-center gap-4 md:gap-6">
            <div className="hidden md:flex items-center gap-6">
              <a href="#how-it-works" className="text-xs font-medium text-[#A0A0A0] hover:text-[#EDEDED] transition-colors">How It Works</a>
              <Link href="/discover" className="text-xs font-medium text-[#A0A0A0] hover:text-[#EDEDED] transition-colors">Talent Graph</Link>
              <Link href="/organizations" className="text-xs font-medium text-[#A0A0A0] hover:text-[#EDEDED] transition-colors">Organizations</Link>
            </div>
            {currentAccount ? (
              <Link href="/dashboard" className="text-xs font-medium bg-[#3ECF8E] text-[#1c1c1c] px-4 py-2 hover:bg-[#2fb379] rounded transition-colors shadow-sm whitespace-nowrap">
                Dashboard
              </Link>
            ) : (
              <div className="flex items-center flex-shrink-0">
                <AuthButton />
              </div>
            )}
          </nav>
        </header>

        <main>
          {/* HERO SECTION */}
          <section className="pt-32 pb-24 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-[#3e3e3e] bg-[#2a2a2a] text-[10px] uppercase tracking-widest text-[#A0A0A0] font-mono mb-8">
                <ShieldCheck size={12} className="text-[#3ECF8E]" /> Trust Infrastructure
              </div>
              <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-[#EDEDED] mb-6 leading-[1.1]">
                Reputation is broken. <br/>
                <span className="text-[#A0A0A0]">We fixed it with cryptography.</span>
              </h1>
              <p className="text-lg text-[#A0A0A0] max-w-xl mb-10 leading-relaxed">
                Resumes are editable. Claims are forged. Prooffolio provides the infrastructure to issue, store, and query verifiable professional credentials on Sui and Walrus.
              </p>
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="px-6 py-3 bg-[#3ECF8E] text-[#1c1c1c] rounded text-sm font-semibold hover:bg-[#2fb379] transition-colors flex items-center gap-2 shadow-sm">
                  Start Building Trust <ArrowRight size={16} />
                </Link>
                <a href="#how-it-works" className="px-6 py-3 border border-[#3e3e3e] rounded text-[#EDEDED] text-sm font-semibold hover:bg-[#2a2a2a] transition-colors">
                  How It Works
                </a>
              </div>
            </div>

            <div className="flex flex-col md:grid md:grid-cols-2 gap-8 md:gap-6 relative mt-12 md:mt-0">
              {/* VS badge for Desktop */}
              <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#1c1c1c] border border-[#3e3e3e] items-center justify-center z-10 font-mono text-[10px] text-[#A0A0A0] shadow-sm">VS</div>
              
              <div className="flex flex-col gap-3 relative">
                <div className="text-xs font-bold text-[#A0A0A0] uppercase tracking-widest text-center">Legacy Web2</div>
                <ResumeMock />
              </div>

              {/* VS badge for Mobile */}
              <div className="flex md:hidden justify-center my-[-16px] z-10 relative">
                <div className="w-8 h-8 rounded-full bg-[#1c1c1c] border border-[#3e3e3e] flex items-center justify-center font-mono text-[10px] text-[#A0A0A0] shadow-sm">VS</div>
              </div>
              
              <div className="flex flex-col gap-3 relative">
                <div className="text-xs font-bold text-[#3ECF8E] uppercase tracking-widest text-center">Prooffolio Web3</div>
                <CredentialPassport 
                  issuer="Amazon Web Services" 
                  title="AWS Certified Solutions Architect" 
                  date="2026-03-14" 
                  hash="0x7f4a...9b2e" 
                />
              </div>
            </div>
          </section>

          {/* PROBLEM VS SOLUTION SECTION */}
          <section className="py-12 px-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Traditional Resume */}
              <div className="bg-[#121212]/50 border border-red-500/10 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none"></div>
                <h3 className="text-lg font-bold text-red-400 mb-6 flex items-center gap-2">
                  Traditional Resume
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-sm text-[#A0A0A0]"><X size={16} className="text-red-500/50 mt-0.5 shrink-0"/> Self-reported & editable without verification.</li>
                  <li className="flex items-start gap-3 text-sm text-[#A0A0A0]"><X size={16} className="text-red-500/50 mt-0.5 shrink-0"/> Hard to verify past employment & skills.</li>
                  <li className="flex items-start gap-3 text-sm text-[#A0A0A0]"><X size={16} className="text-red-500/50 mt-0.5 shrink-0"/> Reputation is fragmented across silos.</li>
                  <li className="flex items-start gap-3 text-sm text-[#A0A0A0]"><X size={16} className="text-red-500/50 mt-0.5 shrink-0"/> Certificates and PDFs can be forged easily.</li>
                </ul>
              </div>

              {/* Prooffolio Passport */}
              <div className="bg-[#121212]/80 border border-[#3ECF8E]/20 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden group shadow-[0_0_40px_rgba(62,207,142,0.05)]">
                <div className="absolute inset-0 bg-gradient-to-br from-[#3ECF8E]/10 to-transparent pointer-events-none"></div>
                <h3 className="text-lg font-bold text-[#3ECF8E] mb-6 flex items-center gap-2">
                  Prooffolio Passport
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-sm text-[#EDEDED]"><CheckCircle2 size={16} className="text-[#3ECF8E] mt-0.5 shrink-0"/> Cryptographically signed & verified proofs.</li>
                  <li className="flex items-start gap-3 text-sm text-[#EDEDED]"><CheckCircle2 size={16} className="text-[#3ECF8E] mt-0.5 shrink-0"/> Immutable on-chain reputation weight.</li>
                  <li className="flex items-start gap-3 text-sm text-[#EDEDED]"><CheckCircle2 size={16} className="text-[#3ECF8E] mt-0.5 shrink-0"/> Portable identity secured by Walrus.</li>
                  <li className="flex items-start gap-3 text-sm text-[#EDEDED]"><CheckCircle2 size={16} className="text-[#3ECF8E] mt-0.5 shrink-0"/> Deterministic talent discovery by recruiters.</li>
                </ul>
              </div>

            </div>
          </section>

          {/* VERIFIABLE BY DESIGN (METRICS ROW) */}
          <section className="py-12 px-6 border-y border-white/5 bg-white/[0.02]">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-[11px] uppercase tracking-widest font-mono text-[#A0A0A0]">
              <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-[#00c2ff]"/> Credentials secured on Sui</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-[#00c2ff]"/> Metadata stored on Walrus</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-[#00c2ff]"/> zkLogin onboarding</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-[#00c2ff]"/> Verifiable reputation graph</div>
              <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-[#00c2ff]"/> Deterministic talent discovery</div>
            </div>
          </section>

          {/* HOW IT WORKS SECTION */}
          <section id="how-it-works" className="py-32 px-6 relative max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="text-xs font-bold text-[#00c2ff] uppercase tracking-widest mb-4">Architecture</div>
              <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-[#EDEDED]">How It Works</h2>
              <p className="text-[#A0A0A0] max-w-2xl mx-auto">A seamless 4-step pipeline that transforms fragmented achievements into a globally verifiable reputation graph.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FlowCard 
                title="1. Create Identity" 
                subtitle="Users initialize a decentralized identity secured natively by zkLogin." 
                icon={Fingerprint} 
                details={["Create Passport", "Upload Resume", "Connect Wallet via zkLogin"]}
              />
              <FlowCard 
                title="2. Issue Credentials" 
                subtitle="Organizations mint cryptographically signed proofs directly to candidates." 
                icon={Award} 
                details={["Register Organization", "Create Credential Object", "Send to Recipient"]}
              />
              <FlowCard 
                title="3. Build Reputation" 
                subtitle="Candidates sync proofs to their passport, increasing their verifiable weight." 
                icon={Database} 
                details={["Sync Credentials", "Update Reputation Weight", "Index Skills on-chain"]}
              />
              <FlowCard 
                title="4. Discover Talent" 
                subtitle="Recruiters execute deterministic queries to find highly-rated professionals." 
                icon={Search} 
                details={["Query Talent Graph", "Reputation Ranking", "Verifiable Discovery"]}
              />
            </div>
          </section>

        </main>


        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#00c2ff]/20 to-transparent" />
        <footer className="py-16 text-center text-[#A0A0A0] text-xs font-mono">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck size={14} className="text-[#3e3e3e]" />
            <span>PROOFFOLIO_INFRASTRUCTURE</span>
          </div>
          <p>Built for Sui Overflow 2026.</p>
        </footer>
      </div>
    </div>
  );
}
