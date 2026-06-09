import { ExternalLink } from "lucide-react";

interface ExplorerLinkProps {
  type: "address" | "object" | "txblock";
  id: string;
  label?: string;
  className?: string;
}

export const ExplorerLink = ({ type, id, label, className = "" }: ExplorerLinkProps) => {
  return (
    <a 
      href={`https://testnet.suivision.xyz/${type}/${id}`} 
      target="_blank" 
      rel="noreferrer" 
      className={`inline-flex items-center gap-1.5 px-2 py-1 bg-[#1c1c1c] border border-[#3e3e3e] hover:border-[#3ECF8E] transition-colors rounded text-[10px] font-mono text-[#A0A0A0] hover:text-[#3ECF8E] ${className}`}
      title="Verify on SuiVision Explorer"
      onClick={(e) => e.stopPropagation()}
    >
      <ExternalLink size={10} />
      {label ? label : `SuiVision`}
    </a>
  );
};
