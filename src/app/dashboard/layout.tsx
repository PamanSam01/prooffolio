"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShieldCheck, 
  LayoutDashboard, 
  BadgeCheck, 
  Search, 
  Building2, 
  User, 
  LogOut, 
  ChevronDown, 
  Lock,
  Compass,
  Zap,
  Network,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { useDisconnectWallet, useSuiClientQuery } from "@mysten/dapp-kit";
import { useSuiClientContext } from "@mysten/dapp-kit";
import { USER_PROFILE_TYPE } from "@/lib/contracts";
import { AuthButton } from "@/components/AuthButton";
import { useAuth } from "@/components/AuthProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { currentAddress, isConnected, logout } = useAuth();
  const { mutate: disconnect } = useDisconnectWallet();
  const { network, selectNetwork } = useSuiClientContext();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleDisconnect = () => {
    logout();
  };

  const { data: profileQuery } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: currentAddress as string,
      filter: { StructType: USER_PROFILE_TYPE },
      options: { showContent: true },
    },
    { enabled: !!currentAddress }
  );

  const profileData = profileQuery?.data?.[0]?.data?.content?.dataType === "moveObject" 
    ? profileQuery.data[0].data.content.fields as any 
    : null;

  const verifiedWeight = profileData ? parseInt(profileData.verified_weight || "0") : 0;
  const credentialCount = profileData ? parseInt(profileData.credential_count || "0") : 0;
  const uniqueIssuers = profileData?.unique_issuers ? profileData.unique_issuers.length : 0;
  
  const proofStrengthRaw = verifiedWeight > 500 ? "EXCEPTIONAL" : verifiedWeight > 100 ? "HIGH" : verifiedWeight > 0 ? "VERIFIED" : "NEW";
  const proofStrength = profileData ? proofStrengthRaw : "PENDING";

  return (
    <div className="flex h-screen bg-[#050816] text-[#EDEDED] overflow-hidden font-sans selection:bg-[#3ECF8E]/30 selection:text-[#EDEDED] relative">
      
      {/* Ambient Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#3ECF8E]/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#3B82F6]/10 blur-[150px] pointer-events-none"></div>

      {/* Mobile Top Navbar */}
      <div className="xl:hidden flex items-center justify-between p-4 border-b border-white/5 bg-black/40 backdrop-blur-2xl fixed top-0 left-0 right-0 z-40 shadow-sm" >
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Prooffolio Logo" className="w-8 h-8 object-contain" />
          <span className="font-semibold text-lg tracking-tight text-white">Prooffolio</span>
        </Link>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors">
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 xl:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed xl:relative inset-y-0 left-0 w-64 border-r border-white/5 bg-[#050816]/90 xl:bg-black/40 backdrop-blur-2xl flex flex-col shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Prooffolio Logo" className="w-8 h-8 object-contain" />
            <span className="font-semibold text-lg tracking-tight text-white">Prooffolio</span>
          </Link>
          <button onClick={() => setIsMobileMenuOpen(false)} className="xl:hidden p-2 text-[#808080] hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          
          {/* IDENTITY */}
          <div className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-3 px-3">Identity</div>
          <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all relative ${pathname === "/dashboard" ? "bg-white/5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" : "text-[#808080] hover:text-white hover:bg-white/5"}`}>
            {pathname === "/dashboard" && <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#3ECF8E] rounded-r-full shadow-[0_0_10px_#3ECF8E]"></div>}
            <LayoutDashboard size={16} className={pathname === "/dashboard" ? "text-[#3ECF8E]" : "group-hover:text-[#3ECF8E] transition-colors"} /> Dashboard
          </Link>
          <Link href="/dashboard/profile" onClick={() => setIsMobileMenuOpen(false)} className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all relative ${pathname.startsWith("/dashboard/profile") ? "bg-white/5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" : "text-[#808080] hover:text-white hover:bg-white/5"}`}>
            {pathname.startsWith("/dashboard/profile") && <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#3ECF8E] rounded-r-full shadow-[0_0_10px_#3ECF8E]"></div>}
            <User size={16} className={pathname.startsWith("/dashboard/profile") ? "text-[#3ECF8E]" : "group-hover:text-[#3ECF8E] transition-colors"} /> Passport
          </Link>
          <Link href="/dashboard/credentials" onClick={() => setIsMobileMenuOpen(false)} className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all relative ${pathname.startsWith("/dashboard/credentials") ? "bg-white/5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" : "text-[#808080] hover:text-white hover:bg-white/5"}`}>
            {pathname.startsWith("/dashboard/credentials") && <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#3ECF8E] rounded-r-full shadow-[0_0_10px_#3ECF8E]"></div>}
            <BadgeCheck size={16} className={pathname.startsWith("/dashboard/credentials") ? "text-[#3ECF8E]" : "group-hover:text-[#3ECF8E] transition-colors"} /> Credentials
          </Link>
          
          {/* DISCOVERY */}
          <div className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-3 mt-8 px-3">Discovery</div>
          <Link href="/discover" onClick={() => setIsMobileMenuOpen(false)} className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all relative ${pathname.startsWith("/discover") ? "bg-white/5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" : "text-[#808080] hover:text-white hover:bg-white/5"}`}>
            {pathname.startsWith("/discover") && <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#3B82F6] rounded-r-full shadow-[0_0_10px_#3B82F6]"></div>}
            <Compass size={16} className={pathname.startsWith("/discover") ? "text-[#3B82F6]" : "group-hover:text-[#3B82F6] transition-colors"} /> Talent Graph
          </Link>
          <Link href="/organizations" onClick={() => setIsMobileMenuOpen(false)} className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all relative ${pathname === "/organizations" ? "bg-white/5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" : "text-[#808080] hover:text-white hover:bg-white/5"}`}>
            {pathname === "/organizations" && <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#3B82F6] rounded-r-full shadow-[0_0_10px_#3B82F6]"></div>}
            <Network size={16} className={pathname === "/organizations" ? "text-[#3B82F6]" : "group-hover:text-[#3B82F6] transition-colors"} /> Organizations
          </Link>
          
          {/* ISSUANCE */}
          <div className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-3 mt-8 px-3">Issuance</div>
          <Link href="/org" onClick={() => setIsMobileMenuOpen(false)} className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all relative ${pathname.startsWith("/org") ? "bg-white/5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" : "text-[#808080] hover:text-white hover:bg-white/5"}`}>
            {pathname.startsWith("/org") && <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#ff9900] rounded-r-full shadow-[0_0_10px_#ff9900]"></div>}
            <Building2 size={16} className={pathname.startsWith("/org") ? "text-[#ff9900]" : "group-hover:text-[#ff9900] transition-colors"} /> Credential Portal
          </Link>

          {/* SYSTEM */}
          <div className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-3 mt-8 px-3">System</div>
          <div className="px-3 mb-4">
            <div className="relative group">
              <select 
                value={network}
                onChange={(e) => selectNetwork(e.target.value)}
                className="w-full bg-black/50 border border-white/10 hover:border-white/20 text-[#EDEDED] text-xs font-medium rounded-lg px-3 py-2.5 appearance-none cursor-pointer focus:outline-none focus:border-[#3ECF8E] transition-colors"
              >
                <option value="testnet">Sui Testnet</option>
                <option value="mainnet" disabled>Sui Mainnet (Locked)</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
                {network === "mainnet" && <Lock size={10} className="text-[#A0A0A0]" />}
                <ChevronDown size={14} className="text-[#A0A0A0]" />
              </div>
            </div>
          </div>

        </nav>

        {/* Sticky Wallet Identity Card */}
        <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-md">
          {isConnected ? (
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#3ECF8E]/20 to-[#3B82F6]/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative bg-[#0c0c0c] border border-white/10 rounded-xl p-3 flex flex-col gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <img 
                    src={profileData?.avatar_blob_id ? `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${profileData.avatar_blob_id}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentAddress}&backgroundColor=transparent`} 
                    className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-white/5 object-cover" 
                    alt="Avatar"
                  />
                  <div className="flex-1 overflow-hidden">
                    <div className="font-bold text-xs text-white truncate">{profileData?.display_name || "Anonymous"}</div>
                    <div className="text-[10px] font-mono text-[#808080] truncate mt-0.5">{currentAddress?.slice(0, 6)}...{currentAddress?.slice(-4)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-2">
                  <span className="text-[9px] text-[#808080] uppercase tracking-widest font-bold">Reputation</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] shadow-[0_0_5px_#3ECF8E]"></span>
                    <span className="text-xs font-mono text-[#3ECF8E] font-bold">{verifiedWeight} WT</span>
                  </div>
                </div>
                <button onClick={handleDisconnect} className="mt-1 flex items-center justify-center gap-2 w-full py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[#808080] hover:text-white hover:bg-white/5 transition-colors">
                  <LogOut size={12} /> Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <AuthButton className="w-full" />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10 pt-[72px] xl:pt-0">
        
        {/* Global Reputation Header */}
        <header className="h-16 border-b border-white/5 bg-black/20 backdrop-blur-xl flex items-center justify-between px-4 lg:px-8 flex-shrink-0 overflow-x-auto custom-scrollbar no-scrollbar gap-8">
          <div className="flex items-center gap-2 flex-shrink-0">
            <ShieldCheck size={18} className="text-[#3ECF8E]" />
            <span className="text-xs font-bold text-[#808080] uppercase tracking-widest whitespace-nowrap">Global Identity Network</span>
          </div>
          
          <div className="flex items-center gap-4 lg:gap-6 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#555] uppercase tracking-widest font-bold whitespace-nowrap">Reputation</span>
              <span className="text-sm font-mono font-bold text-white whitespace-nowrap">{verifiedWeight} <span className="text-[#808080] text-[10px]">WT</span></span>
            </div>
            <div className="w-px h-4 bg-white/10 hidden sm:block"></div>
            <div className="items-center gap-2 hidden sm:flex">
              <span className="text-[10px] text-[#555] uppercase tracking-widest font-bold whitespace-nowrap">Trust Level</span>
              <span className={`text-[10px] font-bold tracking-widest uppercase whitespace-nowrap ${proofStrength === 'NEW' ? 'text-[#808080]' : 'text-[#3B82F6]'}`}>{proofStrength}</span>
            </div>
            <div className="w-px h-4 bg-white/10"></div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#555] uppercase tracking-widest font-bold whitespace-nowrap">Proofs</span>
              <span className="text-sm font-mono font-bold text-white whitespace-nowrap">{credentialCount}</span>
            </div>
            <div className="w-px h-4 bg-white/10 hidden sm:block"></div>
            <div className="items-center gap-2 hidden sm:flex">
              <span className="text-[10px] text-[#555] uppercase tracking-widest font-bold whitespace-nowrap">Issuers</span>
              <span className="text-sm font-mono font-bold text-white whitespace-nowrap">{uniqueIssuers}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          {children}
        </div>
      </main>
    </div>
  );
}
