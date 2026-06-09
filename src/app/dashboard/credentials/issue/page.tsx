"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, FileText, ImageIcon, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, ORGANIZATION_TYPE } from "@/lib/contracts";

type UploadState = "IDLE" | "UPLOADING" | "SUCCESS" | "ERROR";

export default function IssueCredentialPage() {
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction, isPending: isTxPending } = useSignAndExecuteTransaction();

  // Query org to ensure they are verified and get their org ID
  const { data: orgQuery, isLoading: isOrgLoading } = useSuiClientQuery("getOwnedObjects", {
    owner: currentAccount?.address as string,
    filter: { StructType: ORGANIZATION_TYPE },
    options: { showContent: true },
  }, {
    enabled: !!currentAccount,
  });

  const existingOrg = useMemo(() => {
    if (!orgQuery?.data || orgQuery.data.length === 0) return null;
    const obj = orgQuery.data[0].data;
    if (obj?.content?.dataType === "moveObject") {
      const fields = obj.content.fields as any;
      return {
        id: obj.objectId,
        isVerified: fields.is_verified as boolean,
      };
    }
    return null;
  }, [orgQuery]);

  // Form State
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    recipient: "",
    title: "",
    description: "",
    type: "Certification",
    weight: "100",
    tags: "",
  });

  const [image, setImage] = useState<{ file: File | null; previewUrl: string; state: UploadState }>({
    file: null, previewUrl: "", state: "IDLE"
  });
  const [pdf, setPdf] = useState<{ file: File | null; name: string; state: UploadState }>({
    file: null, name: "", state: "IDLE"
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFile = (file: File, type: "image" | "pdf") => {
    if (type === "image") {
      if (!file.type.startsWith("image/")) return alert("Please upload an image file.");
      setImage({ file, previewUrl: URL.createObjectURL(file), state: "SUCCESS" });
    } else {
      if (file.type !== "application/pdf") return alert("Please upload a PDF file.");
      setPdf({ file, name: file.name, state: "SUCCESS" });
    }
  };

  const uploadToWalrus = async (content: string | File) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=5`, {
        method: "PUT",
        body: content,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error("Walrus upload failed");
      const data = await response.json();
      const info = data.newlyCreated || data.alreadyCertified;
      return info.blobObject.blobId;
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  };

  const handleIssue = async () => {
    if (!existingOrg) return;
    if (!form.recipient || !form.title || !form.weight) return alert("Please fill required fields.");

    setIsUploading(true);

    try {
      let imageBlobId = "";
      if (image.file) {
        setUploadStep("Uploading Certificate Image...");
        imageBlobId = await uploadToWalrus(image.file);
      }

      let pdfBlobId = "";
      if (pdf.file) {
        setUploadStep("Uploading PDF Proof...");
        pdfBlobId = await uploadToWalrus(pdf.file);
      }

      setUploadStep("Generating Metadata JSON...");
      const metadata = {
        title: form.title,
        description: form.description,
        credential_type: form.type,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        image_blob_id: imageBlobId,
        pdf_blob_id: pdfBlobId,
        issuer: currentAccount?.address,
        issued_at: Date.now()
      };

      setUploadStep("Uploading Metadata to Walrus...");
      const metadataBlobId = await uploadToWalrus(JSON.stringify(metadata));

      setUploadStep("Awaiting Wallet Confirmation...");
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::registry::issue_weighted_credential`,
        arguments: [
          tx.object(existingOrg.id),
          tx.pure.address(form.recipient),
          tx.pure.string(form.title),
          tx.pure.string(metadataBlobId),
          tx.pure.vector('string', metadata.tags),
          tx.pure.u64(parseInt(form.weight)),
          tx.object('0x6'), // Clock object
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log("Credential Issued:", result);
            setIsUploading(false);
            router.push('/dashboard/credentials/issued');
          },
          onError: (err) => {
            console.error(err);
            alert("Transaction failed.");
            setIsUploading(false);
          },
        }
      );
    } catch (e) {
      console.error(e);
      alert("An error occurred during issuance.");
      setIsUploading(false);
    }
  };

  if (isOrgLoading) {
    return <div className="flex justify-center items-center min-h-[50vh]"><Loader2 className="animate-spin text-[#3B82F6]" /></div>;
  }

  if (!existingOrg) {
    return (
      <div className="w-full max-w-[1440px] 2xl:max-w-[1600px] mx-auto pt-16 px-4 sm:px-6 lg:px-8 pb-24 text-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-12 flex flex-col items-center">
          <ShieldAlert className="text-red-500 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-red-500 mb-2">Organization Not Found</h2>
          <p className="text-[#A0A0A0] max-w-md mx-auto">
            You must register an organization before you can access the Issuance Portal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1440px] 2xl:max-w-[1600px] mx-auto pt-12 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
          Issue Credential
          {!existingOrg.isVerified && (
            <span className="text-xs font-bold text-[#808080] bg-[#151515] border border-white/10 px-2.5 py-1 rounded-full uppercase">
              Unverified Issuer
            </span>
          )}
        </h1>
        <p className="text-[#A0A0A0] text-sm">Mint a verifiable proof to a user's wallet. Assets are pinned to Walrus.</p>
        {!existingOrg.isVerified && (
          <p className="text-[#ff9900] text-xs mt-2 font-medium">
            Note: Your organization is unverified. Credentials issued will carry an unverified status on recipient profiles.
          </p>
        )}
      </div>

      <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-8 space-y-8">
        
        {/* Recipient */}
        <div>
          <label className="block text-xs font-bold text-[#808080] uppercase mb-2">Recipient Wallet Address *</label>
          <input 
            type="text" name="recipient" value={form.recipient} onChange={handleChange} 
            placeholder="0x..."
            className="w-full bg-[#151515] border border-white/5 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-white/30"
          />
        </div>

        {/* Basic Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-[#808080] uppercase mb-2">Credential Title *</label>
            <input 
              type="text" name="title" value={form.title} onChange={handleChange} 
              placeholder="e.g. Senior Move Developer"
              className="w-full bg-[#151515] border border-white/5 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#808080] uppercase mb-2">Credential Type</label>
            <select 
              name="type" value={form.type} onChange={handleChange} 
              className="w-full bg-[#151515] border border-white/5 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 appearance-none"
            >
              <option value="Certification">Certification</option>
              <option value="Degree">Degree</option>
              <option value="Award">Award</option>
              <option value="Employment">Employment</option>
              <option value="Contribution">Contribution</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#808080] uppercase mb-2">Description</label>
          <textarea 
            name="description" value={form.description} onChange={handleChange} rows={3}
            placeholder="Explain the achievement..."
            className="w-full bg-[#151515] border border-white/5 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 resize-none"
          ></textarea>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-[#808080] uppercase mb-2">Reputation Weight (0-1000) *</label>
            <input 
              type="number" min="0" max="1000" name="weight" value={form.weight} onChange={handleChange} 
              className="w-full bg-[#151515] border border-white/5 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#808080] uppercase mb-2">Tags (Comma Separated)</label>
            <input 
              type="text" name="tags" value={form.tags} onChange={handleChange} 
              placeholder="Move, Rust, Sui"
              className="w-full bg-[#151515] border border-white/5 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        {/* Asset Uploads */}
        <div>
          <h3 className="text-xs font-bold text-[#808080] uppercase mb-4 border-b border-white/10 pb-2">Decentralized Assets (Walrus)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Image Upload */}
            <div 
              onClick={() => imageInputRef.current?.click()}
              className="border border-white/5 bg-[#151515] hover:bg-white/5 transition-colors rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer min-h-[140px]"
            >
              <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], "image")}/>
              {image.state === "SUCCESS" ? (
                <>
                  <img src={image.previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded shadow mb-2" />
                  <span className="text-xs text-[#3ECF8E] font-bold flex items-center gap-1"><CheckCircle2 size={12}/> Image Attached</span>
                </>
              ) : (
                <>
                  <ImageIcon size={24} className="text-[#A0A0A0] mb-2" />
                  <span className="text-sm font-bold text-white mb-1">Certificate Image</span>
                  <span className="text-[10px] text-[#808080] uppercase">Optional JPG/PNG</span>
                </>
              )}
            </div>

            {/* PDF Upload */}
            <div 
              onClick={() => pdfInputRef.current?.click()}
              className="border border-white/5 bg-[#151515] hover:bg-white/5 transition-colors rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer min-h-[140px]"
            >
              <input type="file" accept="application/pdf" className="hidden" ref={pdfInputRef} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], "pdf")}/>
              {pdf.state === "SUCCESS" ? (
                <>
                  <FileText size={24} className="text-[#3ECF8E] mb-2" />
                  <span className="text-xs text-[#3ECF8E] font-bold flex items-center gap-1"><CheckCircle2 size={12}/> PDF Attached</span>
                  <span className="text-[10px] text-[#A0A0A0] truncate max-w-[200px] mt-1">{pdf.name}</span>
                </>
              ) : (
                <>
                  <Upload size={24} className="text-[#A0A0A0] mb-2" />
                  <span className="text-sm font-bold text-white mb-1">Proof Document</span>
                  <span className="text-[10px] text-[#808080] uppercase">Optional PDF</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="pt-6 border-t border-white/10 flex justify-end items-center gap-4">
          {isUploading && <span className="text-xs text-[#3B82F6] animate-pulse">{uploadStep}</span>}
          <button 
            onClick={handleIssue}
            disabled={isUploading || isTxPending || !form.recipient || !form.title || !form.weight}
            className="px-8 py-3 bg-white text-black font-bold text-sm rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {(isUploading || isTxPending) && <Loader2 size={16} className="animate-spin" />}
            {isUploading ? "Processing..." : isTxPending ? "Confirming..." : "Mint Credential"}
          </button>
        </div>

      </div>
    </div>
  );
}
