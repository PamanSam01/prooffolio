"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Building2, Globe, Loader2, CheckCircle2, 
  Image as ImageIcon, Info, ArrowRight, Activity, 
  ShieldAlert, ShieldCheck, Copy, PlusCircle, ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, ORGANIZATION_TYPE } from "@/lib/contracts";
import { ExplorerLink } from "@/components/ui/ExplorerLink";
type UploadState = "IDLE" | "UPLOADING" | "SUCCESS" | "ERROR";

const ORG_TYPES = [
  "Web3 Protocol",
  "Enterprise",
  "Startup",
  "University",
  "DAO",
  "Venture Capital",
  "Non-Profit"
];

export default function OrganizationStudio() {
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction, isPending: isTxPending } = useSignAndExecuteTransaction();

  // --- Onchain Queries ---
  const { data: orgQuery, isLoading: isOrgLoading, refetch: refetchOrg } = useSuiClientQuery("getOwnedObjects", {
    owner: currentAccount?.address as string,
    filter: { StructType: ORGANIZATION_TYPE },
    options: { showContent: true },
  }, {
    enabled: !!currentAccount,
  });

  const { data: eventsQuery } = useSuiClientQuery("queryEvents", {
    query: { Sender: currentAccount?.address as string }
  }, {
    enabled: !!currentAccount,
    refetchInterval: 10000
  });

  // --- Derived Onchain State ---
  const existingOrg = useMemo(() => {
    if (!orgQuery?.data || orgQuery.data.length === 0) return null;
    const obj = orgQuery.data[0].data;
    if (obj?.content?.dataType === "moveObject") {
      const fields = obj.content.fields as any;
      return {
        id: obj.objectId,
        name: fields.name as string,
        website: fields.website as string,
        description: fields.description as string,
        logoBlobId: fields.logo_blob_id as string,
        orgType: fields.org_type as string,
        isVerified: fields.is_verified as boolean,
      };
    }
    return null;
  }, [orgQuery]);

  const recentActivity = useMemo(() => {
    if (!eventsQuery?.data) return [];
    // Filter for org-related events
    return eventsQuery.data.filter(e => 
      e.type.includes("OrganizationRegistered") || 
      e.type.includes("OrganizationUpdated") || 
      e.type.includes("CredentialIssued") || 
      e.type.includes("CredentialRevoked")
    ).slice(0, 5); // Take top 5
  }, [eventsQuery]);

  // --- Form State ---
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    website: "",
    description: "",
    orgType: "Web3 Protocol",
  });

  const [logo, setLogo] = useState<{ file: File | null; previewUrl: string; blobId: string; state: UploadState; error: string }>({
    file: null, previewUrl: "", blobId: "", state: "IDLE", error: ""
  });

  const [logoMeta, setLogoMeta] = useState<{ width: number; height: number; size: number; ratio: string; status: "Optimal" | "Suboptimal" } | null>(null);

  const [isUploading, setIsUploading] = useState(false);

  // --- Hydrate Form from Onchain Data ---
  useEffect(() => {
    if (existingOrg) {
      setForm({
        name: existingOrg.name,
        website: existingOrg.website,
        description: existingOrg.description,
        orgType: existingOrg.orgType || "Web3 Protocol",
      });

      if (existingOrg.logoBlobId) {
        setLogo(prev => ({ 
          ...prev, 
          previewUrl: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${existingOrg.logoBlobId}`, 
          blobId: existingOrg.logoBlobId, 
          state: "SUCCESS" 
        }));
      }
    }
  }, [existingOrg]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const uploadToWalrus = async (file: File) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=5`, {
        method: "PUT",
        body: file,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error("Failed to upload to Walrus");
      const data = await response.json();
      const info = data.newlyCreated || data.alreadyCertified;
      return info.blobObject.blobId;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error("Walrus Network Timeout: The publisher endpoint is currently unresponsive.");
      }
      throw error;
    }
  };

  const handleLogoFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setLogo(prev => ({ ...prev, error: "Please upload an image.", state: "ERROR" }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogo(prev => ({ ...prev, error: "File exceeds 5MB limit.", state: "ERROR" }));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    
    // Validate Dimensions
    const img = new window.Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const ratio = width === height ? "1:1" : `${width}:${height}`;
      const status = (width === height && width >= 256) ? "Optimal" : "Suboptimal";
      setLogoMeta({ width, height, size: file.size, ratio, status });
    };
    img.src = previewUrl;

    setLogo({ file, previewUrl, blobId: "", state: "SUCCESS", error: "" });
  };

  const handleCommitOrg = async () => {
    if (!currentAccount) return alert("Please connect your wallet first.");
    if (!existingOrg && !logo.file) {
      return alert("Please upload an Organization Logo.");
    }

    setIsUploading(true);

    try {
      let finalLogoBlobId = logo.blobId;
      if (logo.file) {
        finalLogoBlobId = await uploadToWalrus(logo.file);
        setLogo(prev => ({ ...prev, blobId: finalLogoBlobId }));
      }

      const tx = new Transaction();

      if (existingOrg) {
        tx.moveCall({
          target: `${PACKAGE_ID}::registry::update_organization`,
          arguments: [
            tx.object(existingOrg.id),
            tx.pure.string(form.name),
            tx.pure.string(form.website),
            tx.pure.string(form.description),
            tx.pure.string(finalLogoBlobId),
            tx.pure.string(form.orgType),
          ],
        });
      } else {
        tx.moveCall({
          target: `${PACKAGE_ID}::registry::register_organization`,
          arguments: [
            tx.pure.string(form.name),
            tx.pure.string(form.website),
            tx.pure.string(form.description),
            tx.pure.string(finalLogoBlobId),
            tx.pure.string(form.orgType),
            tx.object('0x6'), // Clock object
          ],
        });
      }

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log("Transaction Success:", result);
            setIsUploading(false);
            refetchOrg();
            // Stay on the same page, refetchOrg will trigger renderDashboard()
          },
          onError: (err) => {
            console.error(err);
            alert("Transaction failed. Make sure your contract is updated and published.");
            setIsUploading(false);
          },
        }
      );
    } catch (e) {
      console.error("Walrus upload failed:", e);
      alert("Failed to upload logo to Walrus Network. Please try again.");
      setIsUploading(false);
    }
  };

  const isReadyToSubmit = form.name !== "" && form.website !== "" && logo.state === "SUCCESS";

  // --- Rendering Functions ---

  const renderPreviewCard = () => (
    <div className="w-full max-w-[380px] mx-auto rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#0a0a0c] flex flex-col relative">
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#3B82F6]/20 to-transparent pointer-events-none"></div>
      <div className="px-6 py-5 flex items-center justify-between relative z-10">
        <div className="text-[9px] font-bold text-[#808080] tracking-[0.2em] uppercase">Organization Identity</div>
        <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${existingOrg?.isVerified ? "bg-[#3ECF8E]/20 text-[#3ECF8E] border border-[#3ECF8E]/30" : "bg-white/5 text-[#A0A0A0] border border-white/10"}`}>
           {existingOrg?.isVerified ? "Verified Issuer" : "Pending Verification"}
        </div>
      </div>
      <div className="px-6 pb-6 flex flex-col flex-grow relative z-10 text-center items-center">
        <div className="w-20 h-20 rounded-2xl border border-white/10 bg-[#151515] overflow-hidden flex-shrink-0 flex items-center justify-center mb-4 shadow-lg">
          {logo.previewUrl ? (
            <img src={logo.previewUrl} alt="Logo" className="w-full h-full object-contain p-2" />
          ) : (
            <Building2 size={32} className="text-[#333]" />
          )}
        </div>
        <h2 className="text-xl font-bold text-white leading-tight tracking-tight mb-1">
          {form.name || "ORGANIZATION NAME"}
        </h2>
        <div className="flex items-center justify-center gap-2 mb-4">
           <span className="text-[10px] text-[#A0A0A0] font-medium uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/5">
             {form.orgType}
           </span>
           <span className="text-[10px] text-[#3B82F6] font-medium tracking-wider flex items-center gap-1">
             <Globe size={10} /> {form.website || "website.com"}
           </span>
        </div>
        <p className="text-xs text-[#808080] leading-relaxed max-w-[90%] line-clamp-3">
           {form.description || "Organization description will appear here..."}
        </p>
      </div>
      <div className="px-6 py-4 bg-[#121215] border-t border-white/5 flex flex-col gap-2">
         <div>
            <div className="text-[8px] text-[#555] uppercase tracking-[0.15em] mb-0.5">Sui Object ID</div>
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-mono text-[#A0A0A0] truncate">
                {existingOrg ? existingOrg.id : "UNMINTED"}
              </div>
              {existingOrg && <ExplorerLink type="object" id={existingOrg.id} />}
            </div>
         </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl border border-white/10 bg-[#0c0c0c] overflow-hidden flex items-center justify-center shadow-2xl relative group">
            {existingOrg?.logoBlobId ? (
              <img src={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${existingOrg.logoBlobId}`} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Building2 size={32} className="text-[#333]" /></div>
            )}
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-1">{existingOrg?.name}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-[#A0A0A0] bg-white/5 px-2.5 py-1 rounded-md border border-white/5">{existingOrg?.orgType}</span>
              <a href={existingOrg?.website} target="_blank" rel="noopener noreferrer" className="text-xs text-[#3B82F6] hover:text-[#60A5FA] flex items-center gap-1 transition-colors">
                <Globe size={12} /> {existingOrg?.website}
              </a>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 min-w-[200px]">
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-xl">
            <div className="text-[10px] text-[#808080] uppercase tracking-widest font-bold mb-1">Owner Address</div>
            <div className="text-xs font-mono text-white flex items-center gap-2 mb-2">
               {currentAccount?.address.slice(0,6)}...{currentAccount?.address.slice(-4)}
            </div>
            {currentAccount && <ExplorerLink type="address" id={currentAccount.address} />}
          </div>
        </div>
      </div>

      {!existingOrg?.isVerified ? (
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-5 flex items-start gap-4 relative z-10 shadow-xl">
          <ShieldAlert className="text-[#808080] flex-shrink-0 mt-0.5" size={24} />
          <div>
            <h3 className="text-[#A0A0A0] font-bold text-sm mb-1">UNVERIFIED ORGANIZATION</h3>
            <p className="text-[#808080] text-xs leading-relaxed">
              This organization is not officially verified by Prooffolio. You can still issue credentials, but they will carry an unverified status on recipient profiles.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-[#3ECF8E]/10 backdrop-blur-xl border border-[#3ECF8E]/20 rounded-xl p-5 flex items-start gap-4 relative z-10 shadow-xl">
          <ShieldCheck className="text-[#3ECF8E] flex-shrink-0 mt-0.5" size={24} />
          <div>
            <h3 className="text-[#3ECF8E] font-bold text-sm mb-1">VERIFIED ORGANIZATION</h3>
            <p className="text-[#A0A0A0] text-xs leading-relaxed">
              Your organization is fully verified on the Sui network. You are authorized to issue reputation-bearing credentials.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <button 
          onClick={() => {
            router.push('/dashboard/credentials/issue');
          }}
          className="bg-white text-black hover:bg-gray-200 font-bold rounded-2xl p-6 flex flex-col items-start gap-4 transition-all text-left shadow-2xl hover:scale-[1.02] group"
        >
          <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center group-hover:bg-black/20 transition-colors"><PlusCircle size={20} /></div>
          <div>
            <div className="text-lg">Issue Credential</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-black/60 mt-1">Mint new certificates</div>
          </div>
        </button>

        <button 
          onClick={() => router.push('/dashboard/credentials/issued')}
          className="bg-black/40 backdrop-blur-xl border border-white/10 text-white hover:bg-white/5 hover:border-white/20 font-bold rounded-2xl p-6 flex flex-col items-start gap-4 transition-all text-left shadow-2xl hover:scale-[1.02] group"
        >
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors"><Building2 size={20} className="text-[#3B82F6]" /></div>
          <div>
            <div className="text-lg">View Issued Credentials</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#808080] mt-1">Manage your issuing graph</div>
          </div>
        </button>

        <button 
          onClick={() => router.push('/dashboard/analytics')}
          className="bg-black/40 backdrop-blur-xl border border-white/10 text-white hover:bg-white/5 hover:border-white/20 font-bold rounded-2xl p-6 flex flex-col items-start gap-4 transition-all text-left shadow-2xl hover:scale-[1.02] group"
        >
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors"><Activity size={20} className="text-[#3ECF8E]" /></div>
          <div>
            <div className="text-lg">Analytics</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#808080] mt-1">Network impact metrics</div>
          </div>
        </button>
      </div>

      <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden relative z-10 shadow-xl">
        <div className="px-6 py-5 border-b border-white/5">
           <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity size={16} className="text-[#808080]" />
              Recent Activity
           </h3>
        </div>
        <div className="p-6">
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-sm text-[#A0A0A0]">Activity history will appear here.</div>
              <div className="text-xs text-[#555] mt-1">Credentials issued and updates will be logged to the ledger.</div>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((event, i) => (
                <div key={i} className="flex items-center gap-4 text-sm border-b border-white/5 pb-4 last:border-0 last:pb-0">
                  <div className="w-2 h-2 rounded-full bg-[#3B82F6]"></div>
                  <div className="flex-grow">
                    <div className="text-white">
                       {event.type.split('::').pop()}
                    </div>
                    <div className="text-[10px] text-[#808080] font-mono mt-1">
                      Tx: {event.id.txDigest.slice(0, 10)}...
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSetup = () => (
    <>
      <div className="mb-8 lg:mb-10 max-w-3xl mx-auto lg:mx-0 px-1 lg:px-0">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-white tracking-tight">Organization Studio</h1>
        <p className="text-sm text-[#808080] max-w-lg leading-relaxed">
          Initialize your verifiable organization identity. This allows you to issue professional credentials to users on the Sui network.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-20">
        <div className="lg:col-span-7 space-y-8 max-w-3xl mx-auto lg:mx-0 w-full">
          <div className="space-y-6">
          <div className="bg-[#0c0c0c] border border-white/10 rounded-xl p-6">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#A0A0A0] mb-5">Identity Parameters</h2>
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-[#808080] uppercase mb-2">Organization Name</label>
                  <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Mysten Labs" className="w-full bg-[#151515] border border-white/5 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#808080] uppercase mb-2">Organization Type</label>
                  <select name="orgType" value={form.orgType} onChange={handleChange} className="w-full bg-[#151515] border border-white/5 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-all appearance-none">
                    {ORG_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#808080] uppercase mb-2">Official Website</label>
                <input type="url" name="website" value={form.website} onChange={handleChange} placeholder="https://..." className="w-full bg-[#151515] border border-white/5 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#808080] uppercase mb-2">Public Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} placeholder="Detail your organization's mission..." rows={3} className="w-full bg-[#151515] border border-white/5 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-all resize-none"></textarea>
              </div>
            </div>
          </div>

          <div className="bg-[#0c0c0c] border border-white/10 rounded-xl p-6">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#A0A0A0] mb-5 flex items-center justify-between">
              <span>Decentralized Assets</span>
              <span className="text-[#3B82F6] font-mono border border-[#3B82F6]/20 bg-[#3B82F6]/10 px-2 py-0.5 rounded">Walrus Network</span>
            </h2>
            <input type="file" accept="image/*" className="hidden" ref={logoInputRef} onChange={(e) => e.target.files?.[0] && handleLogoFile(e.target.files[0])}/>
            <div onClick={() => logoInputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if(e.dataTransfer.files?.[0]) handleLogoFile(e.dataTransfer.files[0]); }} className={`relative border border-white/5 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[160px] group ${logo.state === "ERROR" ? "border-red-500/50 bg-red-500/5" : "bg-[#151515] hover:border-white/20"}`}>
              {logo.state === "IDLE" || logo.state === "ERROR" ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><ImageIcon size={20} className="text-[#A0A0A0]" /></div>
                  <div className="text-sm font-semibold text-white mb-1">Organization Logo</div>
                  <div className="text-[10px] text-[#666] uppercase tracking-wider mb-3">Drag & drop high-res image</div>
                  {logo.error && <div className="text-xs text-red-400">{logo.error}</div>}
                </>
              ) : logo.state === "UPLOADING" ? (
                <Loader2 size={24} className="text-[#A0A0A0] animate-spin" />
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl overflow-hidden mb-3 border border-white/10 shadow-lg bg-[#111]"><img src={logo.previewUrl} alt="Preview" className="w-full h-full object-contain p-1.5" /></div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-[#3ECF8E] font-bold uppercase tracking-wider"><CheckCircle2 size={12}/> Logo Attached</div>
                    {logoMeta && (
                      <div className="flex items-center gap-2 mt-2 bg-black/40 rounded px-2 py-1 border border-white/5">
                        <span className="text-[9px] text-[#808080]">{(logoMeta.size / 1024).toFixed(0)} KB</span>
                        <span className="text-[9px] text-[#808080]">|</span>
                        <span className="text-[9px] text-[#808080]">{logoMeta.width}×{logoMeta.height}</span>
                        <span className="text-[9px] text-[#808080]">|</span>
                        <span className={`text-[9px] font-bold ${logoMeta.status === 'Optimal' ? 'text-[#3ECF8E]' : 'text-[#F59E0B]'}`}>
                          {logoMeta.status}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-[#0c0c0c] border border-white/10 rounded-xl p-6 flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex-grow w-full">
              <h3 className="font-bold text-white mb-3 text-sm">Ready to Initialize?</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-[#A0A0A0]"><CheckCircle2 size={12} className={form.name && form.website ? "text-[#3ECF8E]" : "text-[#333]"}/> Core Metadata</div>
                <div className="flex items-center gap-2 text-[11px] text-[#A0A0A0]"><CheckCircle2 size={12} className={logo.state === "SUCCESS" ? "text-[#3ECF8E]" : "text-[#333]"}/> Logo Asset Attached</div>
              </div>
            </div>
            <button onClick={handleCommitOrg} disabled={isTxPending || isUploading || !currentAccount || !isReadyToSubmit} className="w-full sm:w-auto px-8 py-3.5 bg-white text-black hover:bg-gray-200 font-bold text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 whitespace-nowrap">
              {(isTxPending || isUploading) ? <Loader2 size={18} className="animate-spin" /> : <Building2 size={18} />}
              {isUploading ? "Pinning to Walrus..." : isTxPending ? "Confirming on Sui..." : "Initialize Organization"}
            </button>
          </div>
        </div>
      </div>
      <div className="lg:col-span-5 pt-4 lg:pt-0 w-full flex justify-center lg:justify-start xl:justify-center">
         <div className="sticky top-24 w-full flex flex-col items-center lg:items-start xl:items-center">{renderPreviewCard()}</div>
      </div>
    </div>
    </>
  );

  return (
    <div className="relative min-h-screen font-sans selection:bg-[#3B82F6]/30 selection:text-white pb-24 overflow-x-hidden bg-[#050816]">
      
      {/* Ambient Background Orbs */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#3B82F6]/10 blur-[150px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#3ECF8E]/5 blur-[120px] pointer-events-none z-0"></div>

      {/* Header */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50 shadow-sm">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="Prooffolio Logo" className="w-8 h-8 object-contain" />
          <span className="font-semibold text-lg tracking-tight text-white">Prooffolio</span>
        </Link>
        <nav className="flex items-center gap-6">
          <button onClick={() => router.back()} className="text-xs font-bold uppercase tracking-widest text-[#808080] hover:text-[#3B82F6] transition-colors flex items-center gap-2 cursor-pointer">
            <ArrowLeft size={14} /> Go Back
          </button>
        </nav>
      </header>

      <div className="w-full max-w-[1440px] 2xl:max-w-[1600px] mx-auto pt-16 px-4 sm:px-6 lg:px-8 relative z-10">
        {isOrgLoading ? (
           <div className="flex items-center justify-center min-h-[50vh]"><Loader2 size={32} className="animate-spin text-[#3B82F6]"/></div>
        ) : existingOrg ? renderDashboard() : renderSetup()}
      </div>
    </div>
  );
}
