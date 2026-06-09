import { Copy, ExternalLink, Check } from "lucide-react";
import { useState } from "react";

interface WalrusLinkProps {
  blobId: string;
  label?: string;
  copyable?: boolean;
  className?: string;
}

export const WalrusLink = ({ blobId, label, copyable = true, className = "" }: WalrusLinkProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(blobId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <a 
        href={`https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`} 
        target="_blank" 
        rel="noreferrer" 
        className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#1c1c1c] border border-[#3e3e3e] hover:border-[#3B82F6] transition-colors rounded-l text-[10px] font-mono text-[#A0A0A0] hover:text-[#3B82F6]"
        title="View raw blob on Walrus Network"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink size={10} />
        {label ? label : `Walrus Blob`}
      </a>
      {copyable && (
        <button
          onClick={handleCopy}
          className="flex items-center justify-center px-2 py-1 bg-[#1c1c1c] border border-l-0 border-[#3e3e3e] hover:border-[#3B82F6] transition-colors rounded-r text-[#A0A0A0] hover:text-[#3B82F6]"
          title="Copy Blob ID"
        >
          {copied ? <Check size={10} className="text-[#3ECF8E]" /> : <Copy size={10} />}
        </button>
      )}
    </div>
  );
};
