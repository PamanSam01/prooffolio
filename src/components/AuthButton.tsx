"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ConnectModal, useCurrentAccount } from "@mysten/dapp-kit";
import { X, Wallet, MonitorSmartphone } from "lucide-react";
import { useAuth } from "./AuthProvider";
import Link from "next/link";
import { IconGoogle } from "./ui/SocialIcons"; // I will need to add IconGoogle to SocialIcons

export function AuthButton({ className = "" }: { className?: string }) {
  const { isConnected, currentAddress, authType, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isConnected) {
    if (authType === "zklogin") {
      return (
        <div className="flex items-center gap-3">
          <div className="text-xs font-mono font-bold bg-[#3ECF8E]/10 text-[#3ECF8E] border border-[#3ECF8E]/30 px-3 py-1.5 rounded flex items-center gap-2">
            <IconGoogle size={14} /> Google Verified
          </div>
          <button onClick={logout} className="text-xs font-medium bg-[#1c1c1c] text-[#A0A0A0] px-4 py-2 hover:bg-[#2a2a2a] rounded transition-colors border border-[#3e3e3e]">
            {currentAddress?.slice(0, 6)}...{currentAddress?.slice(-4)}
          </button>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-3">
        <div className="text-[10px] uppercase tracking-widest font-bold bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/30 px-3 py-1.5 rounded">
          Wallet Connected
        </div>
        <button onClick={logout} className="text-xs font-medium bg-[#1c1c1c] text-[#A0A0A0] px-4 py-2 hover:bg-[#2a2a2a] rounded transition-colors border border-[#3e3e3e]">
          {currentAddress?.slice(0, 6)}...{currentAddress?.slice(-4)}
        </button>
      </div>
    );
  }

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className={`bg-[#3ECF8E] text-[#1c1c1c] font-sans text-xs px-4 py-2 hover:bg-[#2fb379] rounded shadow-sm font-bold transition-colors ${className}`}
      >
        Sign In
      </button>

      {showModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0A0A0A] border border-[#3e3e3e] rounded-2xl w-full max-w-sm max-h-[90vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <div className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <MonitorSmartphone size={16} className="text-[#3ECF8E]"/> Auth Gateway
              </div>
              <button onClick={() => setShowModal(false)} className="text-[#A0A0A0] hover:text-white p-1 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <p className="text-xs text-[#A0A0A0] mb-6 text-center leading-relaxed">
                Choose an authentication method to access the Prooffolio reputation network.
              </p>

              <div className="space-y-4">
                <div className="w-full relative group bg-white/5 border border-dashed border-white/10 p-4 rounded-xl flex items-center gap-4 opacity-50 select-none">
                  <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center shadow-sm">
                    <IconGoogle size={20} className="text-white/50" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-sm font-bold text-white flex items-center justify-between">
                      Google zkLogin
                      <span className="text-[9px] bg-black border border-white/10 px-1.5 py-0.5 rounded text-[#A0A0A0]">Planned Feature</span>
                    </div>
                    <div className="text-[10px] text-[#A0A0A0] mt-0.5">Native Google Authentication</div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 py-2">
                  <div className="h-px bg-white/10 flex-1"></div>
                  <div className="text-[10px] text-[#555] font-mono uppercase">OR</div>
                  <div className="h-px bg-white/10 flex-1"></div>
                </div>

                <ConnectModal 
                  trigger={
                    <button className="w-full group bg-white/5 border border-[#3B82F6]/30 p-4 rounded-xl flex items-center gap-4 hover:bg-[#3B82F6]/5 hover:border-[#3B82F6]/50 transition-colors">
                      <div className="w-10 h-10 bg-[#3B82F6]/10 text-[#3B82F6] rounded-lg flex items-center justify-center">
                        <Wallet size={20} />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-white">Connect Wallet</div>
                        <div className="text-[10px] text-[#A0A0A0] mt-0.5">Surf, OKX, Sui Wallet</div>
                      </div>
                    </button>
                  } 
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
