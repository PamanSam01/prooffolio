"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, FileText, Loader2, Save, 
  CheckCircle2, AlertCircle, ShieldCheck, 
  Briefcase, Copy, ExternalLink, RefreshCw,
  QrCode, Info, Link as LinkIcon, Globe
} from "lucide-react";
import { IconX, IconGitHub, IconLinkedIn } from "@/components/ui/SocialIcons";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { PROFILE_REGISTRY_ID, PACKAGE_ID, USER_PROFILE_TYPE, CREDENTIAL_TYPE } from "@/lib/contracts";
import Link from "next/link";
import QRCode from "react-qr-code";

type UploadState = "IDLE" | "UPLOADING" | "SUCCESS" | "ERROR";

export default function PassportStudio() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction, isPending: isTxPending } = useSignAndExecuteTransaction();

  // --- Onchain Queries ---
  const { data: profileQuery, isLoading: isProfileLoading, refetch: refetchProfile } = useSuiClientQuery("getOwnedObjects", {
    owner: currentAccount?.address as string,
    filter: { StructType: USER_PROFILE_TYPE },
    options: { showContent: true },
  }, {
    enabled: !!currentAccount,
  });

  const { data: credsQuery, isLoading: isCredsLoading } = useSuiClientQuery("getOwnedObjects", {
    owner: currentAccount?.address as string,
    filter: { StructType: CREDENTIAL_TYPE },
    options: { showContent: true },
  }, {
    enabled: !!currentAccount,
  });

  // --- Derived Onchain State ---
  const existingProfile = useMemo(() => {
    if (!profileQuery?.data || profileQuery.data.length === 0) return null;
    const obj = profileQuery.data[0].data;
    if (obj?.content?.dataType === "moveObject") {
      const fields = obj.content.fields as any;
      return {
        id: obj.objectId,
        displayName: fields.display_name as string,
        bio: fields.bio as string,
        avatarBlobId: fields.avatar_blob_id as string,
        resumeBlobId: fields.resume_blob_id as string,
        skills: fields.skills as string[],
        baseReputation: parseInt(fields.base_reputation || "0"),
        verifiedWeight: parseInt(fields.verified_weight || "0"),
        credentialCount: parseInt(fields.credential_count || "0"),
        uniqueIssuers: fields.unique_issuers as string[],
      };
    }
    return null;
  }, [profileQuery]);

  const credentials = useMemo(() => {
    if (!credsQuery?.data) return [];
    return credsQuery.data.map(item => {
       const fields = (item.data?.content as any)?.fields;
       if (!fields) return null;
       return {
         id: item.data?.objectId,
         title: fields.title,
         issuer: fields.issuer,
         weight: parseInt(fields.weight || "0"),
         tags: fields.tags || [],
       };
    }).filter(Boolean) as Array<{id: string, title: string, issuer: string, weight: number, tags: string[]}>;
  }, [credsQuery]);

  // Aggregate tags from credentials if skills array is empty
  const derivedSkills = useMemo(() => {
    if (existingProfile?.skills && existingProfile.skills.length > 0) return existingProfile.skills;
    const allTags = credentials.flatMap(c => c.tags);
    return Array.from(new Set(allTags)).slice(0, 5); // top 5 unique tags
  }, [existingProfile, credentials]);

  // --- Form State ---
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    displayName: "",
    role: "", // Stored as part of bio internally: "Role|Bio"
    bio: "",
    x: "",
    github: "",
    linkedin: "",
    website: "",
  });

  const [avatar, setAvatar] = useState<{ file: File | null; previewUrl: string; blobId: string; state: UploadState; error: string }>({
    file: null, previewUrl: "", blobId: "", state: "IDLE", error: ""
  });

  const [resume, setResume] = useState<{ file: File | null; filename: string; blobId: string; state: UploadState; error: string }>({
    file: null, filename: "", blobId: "", state: "IDLE", error: ""
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // --- Hydrate Form from Onchain Data ---
  useEffect(() => {
    if (existingProfile) {
      if (existingProfile.bio.startsWith("v2|walrus:")) {
        const blobId = existingProfile.bio.split(":")[1];
        fetch(`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`)
          .then(res => res.json())
          .then(data => {
            setForm({
              displayName: existingProfile.displayName,
              role: data.role || "",
              bio: data.bio || "",
              x: data.socials?.x || "",
              github: data.socials?.github || "",
              linkedin: data.socials?.linkedin || "",
              website: data.socials?.website || "",
            });
          })
          .catch(err => console.error("Failed to fetch walrus metadata", err));
      } else {
        let rolePart = "Professional";
        let bioPart = existingProfile.bio;
        
        if (existingProfile.bio.includes("|")) {
          const parts = existingProfile.bio.split("|");
          rolePart = parts[0];
          bioPart = parts.slice(1).join("|");
        }

        setForm({
          displayName: existingProfile.displayName,
          role: rolePart,
          bio: bioPart,
          x: "", github: "", linkedin: "", website: ""
        });
      }

      if (existingProfile.avatarBlobId) {
        setAvatar(prev => ({ 
          ...prev, 
          previewUrl: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${existingProfile.avatarBlobId}`, 
          blobId: existingProfile.avatarBlobId, 
          state: "SUCCESS" 
        }));
      }

      if (existingProfile.resumeBlobId) {
        setResume(prev => ({ 
          ...prev, 
          filename: "ProfessionalProof.pdf", 
          blobId: existingProfile.resumeBlobId, 
          state: "SUCCESS" 
        }));
      }
    }
  }, [existingProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const uploadToWalrus = async (file: File) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

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

  const handleAvatarFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setAvatar(prev => ({ ...prev, error: "Please upload an image.", state: "ERROR" }));
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setAvatar({ file, previewUrl, blobId: "", state: "SUCCESS", error: "" });
  };

  const handleResumeFile = (file: File) => {
    if (file.type !== "application/pdf") {
      setResume(prev => ({ ...prev, error: "Please upload a PDF.", state: "ERROR" }));
      return;
    }
    setResume({ file, filename: file.name, blobId: "", state: "SUCCESS", error: "" });
  };

  const handleCommitProfile = async () => {
    if (!currentAccount) return alert("Please connect your wallet first.");
    if (!existingProfile && (!avatar.file || !resume.file)) {
      return alert("Please select both Avatar and Professional Proof files for onboarding.");
    }

    setIsUploading(true);

    try {
      // Upload new files to Walrus if they were just attached (and not already onchain)
      let finalAvatarBlobId = avatar.blobId;
      if (avatar.file) {
        finalAvatarBlobId = await uploadToWalrus(avatar.file);
        setAvatar(prev => ({ ...prev, blobId: finalAvatarBlobId }));
      }

      let finalResumeBlobId = resume.blobId;
      if (resume.file) {
        finalResumeBlobId = await uploadToWalrus(resume.file);
        setResume(prev => ({ ...prev, blobId: finalResumeBlobId }));
      }

      const tx = new Transaction();
      
      let finalCombinedBio = "";
      
      if (form.x || form.github || form.linkedin || form.website || (existingProfile && existingProfile.bio.startsWith("v2|walrus:"))) {
        const metadataJson = {
          role: form.role,
          bio: form.bio,
          socials: {
            x: form.x,
            github: form.github,
            linkedin: form.linkedin,
            website: form.website
          }
        };
        const metadataBlob = new Blob([JSON.stringify(metadataJson)], { type: "application/json" });
        const metadataFile = new File([metadataBlob], "metadata.json", { type: "application/json" });
        const metadataBlobId = await uploadToWalrus(metadataFile);
        finalCombinedBio = `v2|walrus:${metadataBlobId}`;
      } else {
        finalCombinedBio = `${form.role}|${form.bio}`;
      }

      if (existingProfile) {
        // Update
        tx.moveCall({
          target: `${PACKAGE_ID}::registry::update_profile`,
          arguments: [
            tx.object(existingProfile.id),
            tx.pure.string(form.displayName),
            tx.pure.string(finalCombinedBio),
            tx.pure.string(finalAvatarBlobId),
            tx.pure.string(finalResumeBlobId),
          ],
        });
      } else {
        // Mint
        tx.moveCall({
          target: `${PACKAGE_ID}::registry::mint_profile`,
          arguments: [
            tx.object(PROFILE_REGISTRY_ID),
            tx.pure.string(form.displayName),
            tx.pure.string(finalCombinedBio),
            tx.pure.string(finalAvatarBlobId),
            tx.pure.string(finalResumeBlobId),
            tx.object("0x6"), // Sui Clock
          ],
        });
      }

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log("Transaction Success:", result);
            setIsSuccess(true);
            setIsUploading(false);
            refetchProfile();
          },
          onError: (err) => {
            console.error(err);
            alert("Transaction failed. Check console for details.");
            setIsUploading(false);
          },
        }
      );
    } catch (e) {
      console.error("Walrus upload failed:", e);
      alert("Failed to upload assets to Walrus Network. Please try again.");
      setIsUploading(false);
    }
  };

  const isReadyToSubmit = form.displayName !== "" && avatar.state === "SUCCESS" && resume.state === "SUCCESS";
  
  // Computations for UI
  // Note: base_reputation exists on-chain for legacy compatibility.
  // verified_weight is the true proof-based reputation metric used by Dashboard, Public Passport, Query Graph, and Ranking Engine.
  const totalReputation = existingProfile ? existingProfile.verifiedWeight : 0;
  const totalCredentials = existingProfile ? existingProfile.credentialCount : 0;
  const totalOrgs = existingProfile ? existingProfile.uniqueIssuers.length : 0;
  
  // Proof Strength Tiers: 0=NEW, 1-100=VERIFIED, 101-500=HIGH, 500+=EXCEPTIONAL
  const proofStrengthRaw = totalReputation > 500 ? "EXCEPTIONAL" : totalReputation > 100 ? "HIGH" : totalReputation > 0 ? "VERIFIED" : "NEW";
  const proofStrength = existingProfile ? proofStrengthRaw : "PENDING";

  // --- Rendering the Passport Card ---
  const renderCard = () => (
    <div className="relative w-full max-w-[320px] sm:max-w-[380px] aspect-[1/1.55] perspective-1000 mx-auto" onClick={() => setIsFlipped(!isFlipped)}>
      <motion.div 
        className="w-full h-full relative cursor-pointer [transform-style:preserve-3d]"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
      >
        {/* FRONT */}
        <div className="absolute w-full h-full [backface-visibility:hidden] rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 bg-black backdrop-blur-3xl flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
          
          {/* Top Header */}
          <div className="px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between relative z-10">
            <div>
              <div className="text-[9px] sm:text-[10px] font-bold text-[#808080] uppercase tracking-widest mb-1">Identity</div>
              <div className="text-xs sm:text-sm font-bold text-white tracking-widest uppercase">Prooffolio Passport</div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <ShieldCheck className={existingProfile ? "text-[#3ECF8E]" : "text-[#555]"} size={18}/>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-5 sm:p-6 flex flex-col flex-grow relative z-10 overflow-hidden">
            <div className="flex items-start gap-4 sm:gap-5 mb-6 sm:mb-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-2xl relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 z-10"></div>
                {avatar.previewUrl ? (
                  <img src={avatar.previewUrl} alt="Avatar" className="w-full h-full object-cover z-0" />
                ) : (
                  <User size={24} className="text-[#555] z-0" />
                )}
              </div>
              <div className="pt-1 sm:pt-2 min-w-0 flex-1">
                <h2 className="text-lg sm:text-2xl font-bold text-white leading-tight tracking-tight mb-1 truncate">
                  {form.displayName || "Anonymous"}
                </h2>
                <p className="text-[10px] sm:text-xs text-[#3ECF8E] font-bold uppercase tracking-widest mb-2 sm:mb-3 truncate">
                  {form.role || "Professional"}
                </p>
                <div className={`inline-flex items-center gap-1.5 border px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${existingProfile ? "border-[#3ECF8E]/30 bg-[#3ECF8E]/10" : "border-white/10 bg-white/5"}`}>
                  <CheckCircle2 size={10} className={existingProfile ? "text-[#3ECF8E]" : "text-[#808080]"}/>
                  <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider ${existingProfile ? "text-[#3ECF8E]" : "text-[#808080]"}`}>
                    {existingProfile ? "Verified" : "Pending"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4 relative z-10 flex-grow mt-2 sm:mt-4 overflow-hidden flex flex-col">
              
              {(form.bio || form.x || form.github || form.linkedin || form.website) && (
                <div className="pb-1 sm:pb-2 flex-shrink-0">
                  {form.bio && <p className="text-[10px] sm:text-xs text-[#A0A0A0] line-clamp-2 sm:line-clamp-3 leading-relaxed mb-2 sm:mb-3">{form.bio}</p>}
                  <div className="flex items-center gap-3 sm:gap-4">
                    {form.x && <a href={form.x.startsWith('http') ? form.x : `https://${form.x}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#555] hover:text-[#3B82F6] transition-colors"><IconX size={12} /></a>}
                    {form.github && <a href={form.github.startsWith('http') ? form.github : `https://${form.github}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#555] hover:text-[#3B82F6] transition-colors"><IconGitHub size={12} /></a>}
                    {form.linkedin && <a href={form.linkedin.startsWith('http') ? form.linkedin : `https://${form.linkedin}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#555] hover:text-[#3B82F6] transition-colors"><IconLinkedIn size={12} /></a>}
                    {form.website && <a href={form.website.startsWith('http') ? form.website : `https://${form.website}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#555] hover:text-[#3B82F6] transition-colors"><Globe size={12} /></a>}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 sm:gap-2 flex-shrink-0">
                {derivedSkills.length > 0 ? derivedSkills.slice(0, 4).map(skill => (
                   <span key={skill} className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-white/5 border border-white/10 rounded text-[8px] sm:text-[9px] font-bold text-white uppercase tracking-widest truncate max-w-[100px]">{skill}</span>
                )) : (
                   <span className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-white/5 border border-white/10 rounded text-[8px] sm:text-[9px] text-[#555] uppercase tracking-widest">No Skills Indexed</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-y-4 sm:gap-y-6 gap-x-4 border-t border-white/10 pt-4 sm:pt-6 mt-auto">
                <div>
                   <div className="text-[8px] sm:text-[9px] text-[#808080] font-bold uppercase tracking-widest mb-1">Reputation</div>
                   <div className="text-lg sm:text-xl font-bold text-white">{totalReputation} <span className="text-[10px] sm:text-xs text-[#555] font-normal">WT</span></div>
                </div>
                <div>
                   <div className="text-[8px] sm:text-[9px] text-[#808080] font-bold uppercase tracking-widest mb-1">Strength</div>
                   <div className="text-lg sm:text-xl font-bold text-[#3B82F6] truncate">{proofStrength}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="px-5 sm:px-6 py-4 sm:py-5 border-t border-white/10 flex justify-between items-center relative z-10 bg-white/5">
            <div className="text-[9px] sm:text-[10px] font-mono font-bold text-[#555] uppercase tracking-widest">
              ID: {existingProfile ? `${existingProfile.id.slice(0,6)}...${existingProfile.id.slice(-4)}` : "UNMINTED"}
            </div>
            <div className="flex gap-2 items-center">
               <span className="w-1.5 h-1.5 rounded-full bg-[#3ECF8E] shadow-[0_0_5px_#3ECF8E]"></span>
               <span className="text-[8px] sm:text-[10px] text-[#808080] font-bold uppercase tracking-widest">Network Active</span>
            </div>
          </div>
        </div>

        {/* BACK */}
        <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 bg-black flex flex-col justify-between">
          <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-white/10 flex items-center justify-between">
            <div className="text-[9px] sm:text-[10px] font-bold text-[#808080] uppercase tracking-widest">Ledger Verification</div>
            <Briefcase className="text-[#3ECF8E]" size={16}/>
          </div>
          <div className="p-5 sm:p-6 flex flex-col flex-grow space-y-4 sm:space-y-6">
            <div>
              <div className="text-[8px] sm:text-[9px] text-[#555] font-bold uppercase tracking-widest mb-1 sm:mb-2">Controller</div>
              <div className="text-[9px] sm:text-[10px] font-mono text-white break-all bg-white/5 p-2 sm:p-3 border border-white/10 rounded-lg">
                {currentAccount?.address || "NOT CONNECTED"}
              </div>
            </div>
            <div>
              <div className="text-[8px] sm:text-[9px] text-[#555] font-bold uppercase tracking-widest mb-1 sm:mb-2">Storage Layer</div>
              <div className="text-[9px] sm:text-[10px] font-mono text-white bg-white/5 p-2 sm:p-3 border border-white/10 rounded-lg flex items-center gap-2">
                <ExternalLink size={12} className="text-[#3B82F6]"/> Walrus Testnet
              </div>
            </div>
          </div>
          <div className="px-5 sm:px-6 py-4 sm:py-5 border-t border-white/10 flex items-center justify-between bg-white/5">
            {currentAccount ? (
              <div className="bg-white p-1 rounded hover:scale-150 transition-transform origin-bottom-left cursor-crosshair" onClick={(e) => e.stopPropagation()}>
                <QRCode 
                  value={typeof window !== 'undefined' ? `${window.location.origin}/profile/${currentAccount.address}` : `https://prooffolio.com/profile/${currentAccount.address}`} 
                  size={40} 
                />
              </div>
            ) : (
              <QrCode size={32} className="text-[#555]"/>
            )}
            <div className="text-right">
               <div className="text-[8px] sm:text-[9px] font-bold text-[#808080] uppercase tracking-widest mb-1">Contract</div>
               <div className="text-[9px] sm:text-[10px] font-mono font-bold text-[#555]">PKG: {PACKAGE_ID.slice(0,8)}...</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="w-full max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      <div className="relative z-10">
        
        {isProfileLoading || isCredsLoading ? (
           <div className="flex items-center justify-center min-h-[50vh]">
             <Loader2 size={32} className="animate-spin text-[#3B82F6]"/>
           </div>
        ) : isSuccess ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center pt-10"
          >
            <div className="mb-12">
              <h1 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4">Protocol Sync Complete</h1>
              <p className="text-[#808080] text-center max-w-md mx-auto px-4">Your identity parameters and Walrus assets are securely committed to the Sui ledger.</p>
            </div>
            
            {renderCard()}

            <div className="mt-12 flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setIsSuccess(false)}
                className="px-6 py-3 border border-white/10 hover:bg-white/5 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Back to Studio
              </button>
              <Link href={`/profile/${currentAccount?.address}`} className="px-6 py-3 bg-white text-black hover:bg-gray-200 font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2">
                <ExternalLink size={18}/> View Public Protocol
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="mb-8 lg:mb-10 max-w-3xl mx-auto lg:mx-0">
              <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-white tracking-tight">Passport Studio</h1>
              <p className="text-sm text-[#808080] max-w-lg leading-relaxed">
                {existingProfile 
                  ? "Manage your verifiable professional identity. Changes will be synced to the Sui network and your assets stored on Walrus."
                  : "Initialize your verifiable professional identity. Minting registers your baseline reputation parameters on-chain."}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-20">
              
              {/* Left Column: Form Controls */}
              <div className="lg:col-span-7 space-y-8 max-w-3xl mx-auto lg:mx-0 w-full">

              <div className="space-y-6">
                {/* Personal Details */}
                <div className="bg-[#0c0c0c] border border-white/10 rounded-xl p-6">
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#A0A0A0] mb-5">Identity Parameters</h2>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[10px] font-bold text-[#808080] uppercase mb-2">Legal / Display Name</label>
                        <input 
                          type="text" 
                          name="displayName"
                          value={form.displayName}
                          onChange={handleChange}
                          placeholder="e.g. John Doe"
                          className="w-full bg-[#151515] border border-white/5 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#808080] uppercase mb-2">Primary Role</label>
                        <input 
                          type="text" 
                          name="role"
                          value={form.role}
                          onChange={handleChange}
                          placeholder="e.g. Solidity Security Auditor"
                          className="w-full bg-[#151515] border border-white/5 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#808080] uppercase mb-2">Professional Summary</label>
                      <textarea 
                        name="bio"
                        value={form.bio}
                        onChange={handleChange}
                        placeholder="Detail your verifiable experience..."
                        rows={3}
                        className="w-full bg-[#151515] border border-white/5 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-all resize-none"
                      ></textarea>
                    </div>
                  </div>
                </div>

                {/* Professional Socials */}
                <div className="bg-[#0c0c0c] border border-white/10 rounded-xl p-6">
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#A0A0A0] mb-5">
                    Professional Identity
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-bold text-[#808080] uppercase mb-2 flex items-center gap-1.5"><IconX size={12}/> X / Twitter</label>
                      <input type="text" name="x" value={form.x} onChange={handleChange} placeholder="https://x.com/..." className="w-full bg-[#151515] border border-white/5 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#808080] uppercase mb-2 flex items-center gap-1.5"><IconGitHub size={12}/> GitHub</label>
                      <input type="text" name="github" value={form.github} onChange={handleChange} placeholder="https://github.com/..." className="w-full bg-[#151515] border border-white/5 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#808080] uppercase mb-2 flex items-center gap-1.5"><IconLinkedIn size={12}/> LinkedIn</label>
                      <input type="text" name="linkedin" value={form.linkedin} onChange={handleChange} placeholder="https://linkedin.com/in/..." className="w-full bg-[#151515] border border-white/5 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#808080] uppercase mb-2 flex items-center gap-1.5"><Globe size={12}/> Personal Website</label>
                      <input type="text" name="website" value={form.website} onChange={handleChange} placeholder="https://..." className="w-full bg-[#151515] border border-white/5 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-all" />
                    </div>
                  </div>
                </div>

                {/* Decentralized Storage */}
                <div className="bg-[#0c0c0c] border border-white/10 rounded-xl p-6">
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#A0A0A0] mb-5 flex items-center justify-between">
                    <span>Decentralized Assets</span>
                    <span className="text-[#3B82F6] font-mono border border-[#3B82F6]/20 bg-[#3B82F6]/10 px-2 py-0.5 rounded">Walrus Network</span>
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    {/* Avatar Upload */}
                    <div>
                      <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={(e) => e.target.files?.[0] && handleAvatarFile(e.target.files[0])}/>
                      <div 
                        onClick={() => avatarInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); if(e.dataTransfer.files?.[0]) handleAvatarFile(e.dataTransfer.files[0]); }}
                        className={`relative border border-white/5 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[140px] group
                          ${avatar.state === "ERROR" ? "border-red-500/50 bg-red-500/5" : "bg-[#151515] hover:border-white/20"}`}
                      >
                        {avatar.state === "IDLE" || avatar.state === "ERROR" ? (
                          <>
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><User size={14} className="text-[#A0A0A0]" /></div>
                            <div className="text-xs font-semibold text-white mb-1">Profile Portrait</div>
                            <div className="text-[9px] text-[#666] uppercase tracking-wider">Drag & drop image</div>
                          </>
                        ) : avatar.state === "UPLOADING" ? (
                          <Loader2 size={20} className="text-[#A0A0A0] animate-spin" />
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-full overflow-hidden mb-2 border border-white/10"><img src={avatar.previewUrl} alt="Preview" className="w-full h-full object-cover" /></div>
                            <div className="flex items-center gap-1 text-[9px] text-[#3ECF8E] font-bold uppercase tracking-wider"><CheckCircle2 size={10}/> Ready for Verification</div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Resume Upload -> Professional Proof */}
                    <div>
                      <input type="file" accept="application/pdf" className="hidden" ref={resumeInputRef} onChange={(e) => e.target.files?.[0] && handleResumeFile(e.target.files[0])}/>
                      <div 
                        onClick={() => resumeInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); if(e.dataTransfer.files?.[0]) handleResumeFile(e.dataTransfer.files[0]); }}
                        className={`relative border border-white/5 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[140px] group
                          ${resume.state === "ERROR" ? "border-red-500/50 bg-red-500/5" : "bg-[#151515] hover:border-white/20"}`}
                      >
                        {resume.state === "IDLE" || resume.state === "ERROR" ? (
                          <>
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"><FileText size={14} className="text-[#A0A0A0]" /></div>
                            <div className="text-xs font-semibold text-white mb-1">Professional Proof</div>
                            <div className="text-[9px] text-[#666] uppercase tracking-wider">PDF Portfolio / Resume</div>
                          </>
                        ) : resume.state === "UPLOADING" ? (
                          <Loader2 size={20} className="text-[#A0A0A0] animate-spin" />
                        ) : (
                          <>
                            <div className="w-8 h-8 rounded-full bg-[#3ECF8E]/10 flex items-center justify-center mb-2"><FileText size={14} className="text-[#3ECF8E]" /></div>
                            <div className="text-[10px] text-white truncate max-w-[120px] mb-1">{resume.filename}</div>
                            <div className="flex items-center gap-1 text-[9px] text-[#3ECF8E] font-bold uppercase tracking-wider"><CheckCircle2 size={10}/> Ready for Verification</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Privacy Notice */}
                  <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 flex gap-3">
                     <Info size={16} className="text-[#808080] flex-shrink-0 mt-0.5"/>
                     <div>
                       <h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-1">Public Storage Notice</h4>
                       <p className="text-[11px] text-[#808080] leading-relaxed mb-2">
                         Files stored on Walrus may be publicly accessible. Upload only portfolio materials, certifications, project proofs, and public-facing professional information. Do not upload sensitive personal information.
                       </p>
                       <div className="text-[9px] text-[#555] italic">
                         *Roadmap: Future protocol updates will introduce client-side asset encryption and selective disclosure controls.
                       </div>
                     </div>
                  </div>
                </div>

                {/* Mint/Update Action */}
                <div className="bg-[#0c0c0c] border border-white/10 rounded-xl p-6 flex flex-col sm:flex-row justify-between items-center gap-6">
                  <div className="flex-grow w-full">
                    <h3 className="font-bold text-white mb-3 text-sm">{existingProfile ? "Ready to Sync?" : "Ready to Initialize?"}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[11px] text-[#A0A0A0]">
                        <CheckCircle2 size={12} className={form.displayName && form.role ? "text-[#3ECF8E]" : "text-[#333]"}/> Identity Parameters Complete
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#A0A0A0]">
                        <CheckCircle2 size={12} className={avatar.state === "SUCCESS" && resume.state === "SUCCESS" ? "text-[#3ECF8E]" : "text-[#333]"}/> Assets Ready for Walrus
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#A0A0A0]">
                        <CheckCircle2 size={12} className={isReadyToSubmit ? "text-[#3ECF8E]" : "text-[#333]"}/> Passport Ready for Sui Ledger
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={handleCommitProfile}
                    disabled={isTxPending || isUploading || !currentAccount || !isReadyToSubmit}
                    className="w-full sm:w-auto px-8 py-3.5 bg-white text-black hover:bg-gray-200 font-bold text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    {(isTxPending || isUploading) ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {isUploading ? "Pinning to Walrus..." : isTxPending ? "Confirming on Sui..." : existingProfile ? "Sync to Ledger" : "Initialize Passport"}
                  </button>
                </div>

              </div>
            </div>

            {/* Right Column: Live Preview Card */}
            <div className="lg:col-span-5 pt-4 lg:pt-0 w-full flex justify-center lg:justify-start xl:justify-center">
               <div className="sticky top-24 w-full flex flex-col items-center lg:items-start xl:items-center">
                  {renderCard()}
                  <div className="text-center mt-6 text-[10px] text-[#666] font-medium flex items-center justify-center gap-1.5 uppercase tracking-widest cursor-pointer hover:text-[#A0A0A0] transition-colors" onClick={() => setIsFlipped(!isFlipped)}>
                    <RefreshCw size={12}/> Click card to flip
                  </div>
               </div>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
