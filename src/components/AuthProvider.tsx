"use client";

import { createContext, useContext, ReactNode } from "react";
import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";

type AuthType = "wallet" | "zklogin" | null;

interface AuthContextType {
  currentAddress: string | null;
  isConnected: boolean;
  authType: AuthType;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnectWallet } = useDisconnectWallet();

  // In the future, we will also check zkLogin session state here.
  // For now, it only maps the wallet state.
  const authType: AuthType = currentAccount ? "wallet" : null;
  const currentAddress = currentAccount?.address || null;
  const isConnected = !!currentAddress;

  const logout = () => {
    if (authType === "wallet") {
      disconnectWallet();
    }
    // Future: clear zkLogin session
  };

  return (
    <AuthContext.Provider value={{ currentAddress, isConnected, authType, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
