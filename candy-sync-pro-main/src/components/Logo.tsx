import { useEmpresa } from "@/hooks/useEmpresa";
import { LOGO_SSD } from "@/lib/empresa";

export function Logo({ className = "h-16", alt = "SSD Atacado" }: { className?: string; alt?: string }) {
  const { empresa } = useEmpresa();
  return <img src={empresa.logo_url || LOGO_SSD} alt={alt} className={`w-auto object-contain ${className}`} />;
}
