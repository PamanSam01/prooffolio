"use client";

import { ShieldCheck, CheckCircle2, Loader2, FileDigit, RefreshCw, X, Download, ExternalLink } from "lucide-react";
import { useCurrentAccount, useSuiClientQuery, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { CREDENTIAL_TYPE, USER_PROFILE_TYPE, PACKAGE_ID } from "@/lib/contracts";
import { ExplorerLink } from "@/components/ui/ExplorerLink";

import { useEffect, useState } from "react";

const CredentialCard = ({ cred, profileData, refetchAll }: { cred: any, profileData: any, refetchAll: () => void }) => {
  const fields = cred?.data?.content?.fields;
  const title = fields?.title || "Unknown Credential";
  const issuer = fields?.issuer || "0x...";
  const weight = fields?.weight || "0";
  const tags = fields?.tags || [];
  const objectId = cred?.data?.objectId;
  const metadataBlobId = fields?.metadata_blob_id;

  const [metadata, setMetadata] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [localSynced, setLocalSynced] = useState(false);
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const isSynced = localSynced || profileData?.syncedCreds?.includes(objectId);

  const handleDownload = async (blobId: string, filename: string, setDownloading: (val: boolean) => void) => {
    try {
      setDownloading(true);
      const response = await fetch(`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download file.");
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (metadataBlobId) {
      fetch(`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${metadataBlobId}`)
        .then(res => res.json())
        .then(data => setMetadata(data))
        .catch(console.error);
    }
  }, [metadataBlobId]);

  return (
    <div className="p-6 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-white/20 transition-all duration-500 flex flex-col">
      {/* Ambient Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0"></div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold tracking-[0.2em] text-[#555] uppercase mb-1">Verified Issuer</span>
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#A0A0A0] bg-white/5 border border-white/10 px-2 py-1 rounded">
            <FileDigit size={12} className="text-[#3B82F6]" />
            {issuer.slice(0, 8)}...{issuer.slice(-6)}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#3ECF8E] bg-[#3ECF8E]/10 border border-[#3ECF8E]/30 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(62,207,142,0.15)]">
          <ShieldCheck size={14} /> {weight} WT
        </div>
      </div>

      {metadata?.image_blob_id && (
        <div 
          className="w-full h-48 mb-6 bg-[#0c0c0c] rounded-2xl overflow-hidden border border-white/5 relative z-10 flex items-center justify-center cursor-pointer group/image shadow-inner"
          onClick={() => setIsPreviewOpen(true)}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none"></div>
          <img 
            src={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${metadata.image_blob_id}`} 
            alt="Badge" 
            className="h-full w-full object-contain p-4 group-hover/image:scale-110 transition-transform duration-700 ease-out z-0" 
          />
          <div className="absolute top-3 right-3 z-20 opacity-0 group-hover/image:opacity-100 transition-opacity">
            <div className="bg-black/60 backdrop-blur border border-white/10 p-1.5 rounded-lg text-white">
              <ExternalLink size={14} />
            </div>
          </div>
        </div>
      )}

      <h3 className="text-xl font-bold text-white mb-2 relative z-10 leading-tight">{title}</h3>
      
      {metadata?.description && (
        <p className="text-xs text-[#808080] mb-5 relative z-10 line-clamp-2 leading-relaxed">{metadata.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-6 relative z-10">
        {tags.map((t: string, i: number) => (
          <span key={i} className="text-[9px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 text-[#808080] px-2 py-1 rounded">
            {t}
          </span>
        ))}
      </div>

      <div className="flex gap-3 mb-6 relative z-10">
        {metadata?.image_blob_id && (
          <button
            onClick={() => handleDownload(metadata.image_blob_id, `${title.replace(/\s+/g, '_')}_Certificate.png`, setIsDownloadingImage)}
            disabled={isDownloadingImage}
            className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[#A0A0A0] transition-colors disabled:opacity-50"
          >
            {isDownloadingImage ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Image
          </button>
        )}
        {metadata?.pdf_blob_id && (
          <button
            onClick={() => handleDownload(metadata.pdf_blob_id, `${title.replace(/\s+/g, '_')}_PDF.pdf`, setIsDownloadingPdf)}
            disabled={isDownloadingPdf}
            className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[#A0A0A0] transition-colors disabled:opacity-50"
          >
            {isDownloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
          </button>
        )}
      </div>

      <div className="mt-auto pt-5 border-t border-white/10 flex flex-col gap-5 relative z-10">
        <div className="flex flex-col gap-1.5">
          <p className="text-[9px] text-[#555] uppercase tracking-[0.2em] font-bold">Ledger ID</p>
          <div className="flex items-center gap-3">
            <p className="text-xs font-mono text-[#A0A0A0]">{objectId?.slice(0, 10)}...{objectId?.slice(-4)}</p>
            <ExplorerLink type="object" id={objectId} label="View Explorer" />
          </div>
        </div>

        {/* Sync Button */}
        <button 
          disabled={isSynced || isSyncing}
          onClick={() => {
            if (!profileData) {
              alert("Please create a User Passport first! Go to 'Passport Studio' to initialize your profile.");
              return;
            }
            setIsSyncing(true);
            const tx = new Transaction();
            tx.moveCall({
              target: `${PACKAGE_ID}::registry::sync_credential`,
              arguments: [
                tx.object(profileData.id),
                tx.object(objectId),
              ],
            });
            signAndExecuteTransaction({ transaction: tx }, {
              onSuccess: () => {
                setIsSyncing(false);
                setLocalSynced(true); // Optimistic UI update
                // Delay refetch slightly to allow RPC indexer to catch up
                setTimeout(() => {
                  refetchAll();
                }, 2000);
              },
              onError: (err) => {
                console.error(err);
                setIsSyncing(false);
                alert("Sync failed.");
              }
            });
          }}
          className={`w-full py-3.5 rounded-xl text-[10px] font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-2 transition-all shadow-lg ${
            isSynced 
              ? "bg-[#3ECF8E]/10 text-[#3ECF8E] border border-[#3ECF8E]/30" 
              : !profileData
                ? "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                : "bg-white text-black hover:bg-gray-200 disabled:opacity-50"
          }`}
        >
          {isSyncing ? <Loader2 size={16} className="animate-spin" /> : isSynced ? <CheckCircle2 size={16} /> : <RefreshCw size={16} />}
          {isSyncing ? "Syncing to Ledger..." : isSynced ? "Synced To Passport" : !profileData ? "Create Passport First" : "Sync To Passport"}
        </button>
      </div>

      {/* Lightbox Modal */}
      {isPreviewOpen && metadata?.image_blob_id && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div 
            className="relative w-[95vw] md:max-w-3xl max-h-[90vh] flex flex-col items-center gap-6 bg-black/50 p-4 md:p-8 rounded-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-end">
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="text-[#A0A0A0] hover:text-white transition-colors p-2 bg-white/5 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <img 
              src={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${metadata.image_blob_id}`} 
              alt={title} 
              className="w-auto h-auto max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl" 
            />
            <h2 className="text-2xl font-bold text-white text-center">{title}</h2>
          </div>
        </div>
      )}
    </div>
  );
};

export default function CredentialsPage() {
  const currentAccount = useCurrentAccount();

  const { data: credsData, isPending: isCredsPending, refetch: refetchCreds } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: currentAccount?.address as string,
      filter: { StructType: CREDENTIAL_TYPE },
      options: { showContent: true },
    },
    { enabled: !!currentAccount }
  );

  const { data: profileQuery, isPending: isProfilePending, refetch: refetchProfile } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: currentAccount?.address as string,
      filter: { StructType: USER_PROFILE_TYPE },
      options: { showContent: true },
    },
    { enabled: !!currentAccount }
  );

  const credentials = credsData?.data || [];
  
  const profileData = profileQuery?.data?.[0]?.data?.content?.dataType === "moveObject" 
    ? { 
        id: profileQuery.data[0].data.objectId, 
        syncedCreds: (profileQuery.data[0].data.content.fields as any).synced_creds || [] 
      } 
    : null;

  const handleRefetchAll = () => {
    refetchCreds();
    refetchProfile();
  };

  return (
    <div className="w-full max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">Proof Artifacts</h1>
          <p className="text-sm text-[#808080]">Manage your verified credentials stored immutably on the Walrus Network.</p>
        </div>
      </div>

      {!currentAccount ? (
        <div className="p-16 text-center border border-white/5 rounded-3xl bg-black/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#3B82F6]/5 blur-[80px] rounded-full"></div>
          <ShieldCheck size={56} className="text-[#3B82F6]/50 mx-auto mb-6 relative z-10" />
          <h2 className="text-2xl font-bold text-white mb-3 relative z-10">Authentication Required</h2>
          <p className="text-sm text-[#808080] max-w-md mx-auto relative z-10">Connect your Sui wallet to view your proof artifacts and credentials.</p>
        </div>
      ) : isCredsPending || isProfilePending ? (
        <div className="flex justify-center p-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#3B82F6]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {credentials.length > 0 ? credentials.map((cred: any, idx: number) => (
            <CredentialCard key={idx} cred={cred} profileData={profileData} refetchAll={handleRefetchAll} />
          )) : (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-20 border border-white/5 rounded-3xl bg-black/20 backdrop-blur-sm">
              <FileDigit size={48} className="text-[#555] mx-auto mb-4" />
              <div className="text-sm font-bold text-[#A0A0A0] uppercase tracking-widest mb-1">Ledger Empty</div>
              <div className="text-xs text-[#555] font-mono">You haven't received any credentials yet.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
