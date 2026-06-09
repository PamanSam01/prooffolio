"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2, ShieldAlert, CheckCircle2, XCircle, FileText, Download, X } from "lucide-react";
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction, useSuiClientQuery } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, ORGANIZATION_TYPE } from "@/lib/contracts";

// --- Metadata Viewer Modal Component ---
const MetadataViewer = ({ blobId, onClose }: { blobId: string, onClose: () => void }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`)
      .then(res => res.json())
      .then(json => { setData(json); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, [blobId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#121215] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-[#808080] hover:text-white rounded-full hover:bg-white/10 transition-colors">
          <X size={20} />
        </button>
        <div className="p-6 border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText size={18} className="text-[#3B82F6]" /> Walrus Metadata Proof
          </h2>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#3B82F6]" /></div>
          ) : data ? (
            <div className="space-y-6">
              {data.image_blob_id && (
                <div className="w-full h-48 rounded-xl overflow-hidden bg-[#1a1a1a] border border-white/10">
                  <img src={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${data.image_blob_id}`} alt="Certificate" className="w-full h-full object-contain" />
                </div>
              )}
              <div>
                <div className="text-[10px] text-[#808080] uppercase tracking-wider font-bold mb-1">Title</div>
                <div className="text-lg font-bold text-white">{data.title}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#808080] uppercase tracking-wider font-bold mb-1">Description</div>
                <div className="text-sm text-[#A0A0A0] leading-relaxed">{data.description}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-[#808080] uppercase tracking-wider font-bold mb-1">Type</div>
                  <div className="text-sm text-white">{data.credential_type}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#808080] uppercase tracking-wider font-bold mb-1">Issued At</div>
                  <div className="text-sm text-white">{new Date(data.issued_at).toLocaleString()}</div>
                </div>
              </div>
              {data.tags && data.tags.length > 0 && (
                <div>
                  <div className="text-[10px] text-[#808080] uppercase tracking-wider font-bold mb-2">Verified Skills / Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {data.tags.map((tag: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 rounded-md text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {data.pdf_blob_id && (
                <div className="pt-4 border-t border-white/10">
                  <a href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${data.pdf_blob_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-[#1a1a1a] hover:bg-[#222] border border-white/10 rounded-xl text-sm font-bold text-white transition-colors">
                    <Download size={16} /> Download PDF Proof
                  </a>
                </div>
              )}
              <div className="pt-4 border-t border-white/10">
                <div className="text-[10px] text-[#808080] uppercase tracking-wider font-bold mb-1">Raw JSON Blob ID</div>
                <div className="text-[10px] font-mono text-[#555] break-all">{blobId}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-[#ff9900]">Failed to load metadata from Walrus.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function IssuedCredentialsPage() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  // Organization fetch
  const { data: orgQuery } = useSuiClientQuery("getOwnedObjects", {
    owner: currentAccount?.address as string,
    filter: { StructType: ORGANIZATION_TYPE },
    options: { showContent: true },
  }, { enabled: !!currentAccount });

  const existingOrg = useMemo(() => {
    if (!orgQuery?.data || orgQuery.data.length === 0) return null;
    return { id: orgQuery.data[0].data?.objectId, owner: currentAccount?.address };
  }, [orgQuery]);

  // Credentials fetch state
  const [credentials, setCredentials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingBlobId, setViewingBlobId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentAccount) return;
    
    const fetchIssued = async () => {
      try {
        // Step 1: Find events emitted by this wallet related to credential issuance
        const events = await suiClient.queryEvents({
          query: { Sender: currentAccount.address }
        });
        
        const issuedEvents = events.data.filter(e => e.type.includes("CredentialIssued"));
        const credIds = issuedEvents.map(e => (e.parsedJson as any).cred_id).filter(Boolean);

        if (credIds.length === 0) {
          setIsLoading(false);
          return;
        }

        // Step 2: Fetch the live object states
        const objects = await suiClient.multiGetObjects({
          ids: credIds,
          options: { showContent: true }
        });

        // Filter out objects that might have been completely destroyed (rare for credentials, but safe)
        const validObjects = objects.filter(o => o.data?.content?.dataType === "moveObject").map(o => {
          const fields = (o.data?.content as any).fields;
          return {
            id: o.data?.objectId,
            recipient: fields.recipient,
            title: fields.title,
            weight: fields.weight,
            tags: fields.tags || [],
            metadata_blob_id: fields.metadata_blob_id,
            issued_at: fields.issued_at,
            revoked: fields.revoked
          };
        });

        // Sort by newest
        validObjects.sort((a, b) => Number(b.issued_at) - Number(a.issued_at));
        setCredentials(validObjects);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIssued();
  }, [currentAccount, suiClient]);

  const handleRevoke = (credId: string) => {
    if (!existingOrg || !existingOrg.id) return;
    if (!confirm("Are you sure you want to revoke this credential? This action is permanent.\n\n[WARNING: Experimental Feature - Will fail on-chain due to recipient ownership model]")) return;
    
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::registry::revoke_credential`,
      arguments: [
        tx.object(existingOrg.id),
        tx.object(credId),
      ],
    });

    signAndExecuteTransaction(
      { transaction: tx },
      {
        onSuccess: () => alert("Credential Revoked successfully."),
        onError: (err) => {
          console.error(err);
          alert("Revocation failed. As audited, the current smart contract requires the credential to be shared or owned by the issuer to execute this. It is currently owned by the recipient.");
        }
      }
    );
  };

  return (
    <div className="w-full max-w-[1440px] 2xl:max-w-[1600px] mx-auto pt-12 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Issued Credentials</h1>
          <p className="text-[#A0A0A0] text-sm">Manage the verifiable proofs your organization has distributed.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[40vh]"><Loader2 className="animate-spin text-[#3B82F6]" size={32} /></div>
      ) : credentials.length === 0 ? (
        <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-16 text-center">
          <FileText size={48} className="text-[#333] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Credentials Issued</h3>
          <p className="text-[#A0A0A0] text-sm max-w-md mx-auto">Your organization has not minted any verifiable credentials yet. Go to the Issue Credential center to get started.</p>
        </div>
      ) : (
        <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#121215] text-[#808080] text-[10px] uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-bold">Credential</th>
                  <th className="px-6 py-4 font-bold">Recipient</th>
                  <th className="px-6 py-4 font-bold text-center">Weight</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[#EDEDED]">
                {credentials.map((cred, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white mb-1">{cred.title}</div>
                      <div className="text-[10px] text-[#A0A0A0] font-mono">Issued: {new Date(Number(cred.issued_at)).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-mono bg-black/50 px-2 py-1 rounded inline-block border border-white/5">
                        {cred.recipient.slice(0, 6)}...{cred.recipient.slice(-4)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-0.5 rounded text-xs">{cred.weight}</span>
                    </td>
                    <td className="px-6 py-4">
                      {cred.revoked ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-400/10 px-2.5 py-1 rounded-full">
                          <XCircle size={14} /> Revoked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3ECF8E] bg-[#3ECF8E]/10 px-2.5 py-1 rounded-full">
                          <CheckCircle2 size={14} /> Valid
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                      <button 
                        onClick={() => setViewingBlobId(cred.metadata_blob_id)}
                        className="text-xs font-bold text-[#A0A0A0] hover:text-white transition-colors"
                      >
                        Metadata
                      </button>
                      <button 
                        onClick={() => handleRevoke(cred.id)}
                        disabled={cred.revoked}
                        className="text-xs font-bold text-red-400/50 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Experimental Feature"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewingBlobId && <MetadataViewer blobId={viewingBlobId} onClose={() => setViewingBlobId(null)} />}
    </div>
  );
}
