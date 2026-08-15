import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EMPRESA_PADRAO, type Empresa } from "@/lib/empresa";

const CACHE = "ssd:empresa";

export function empresaCacheada(): Empresa {
  try {
    const raw = localStorage.getItem(CACHE);
    if (raw) return { ...EMPRESA_PADRAO, ...(JSON.parse(raw) as Empresa) };
  } catch {
    /* ignora */
  }
  return EMPRESA_PADRAO;
}

export function useEmpresa() {
  const query = useQuery({
    queryKey: ["empresa"],
    queryFn: async (): Promise<Empresa> => {
      const { data, error } = await supabase.from("empresa").select("*").limit(1).maybeSingle();
      if (error) throw error;
      const empresa = { ...EMPRESA_PADRAO, ...(data ?? {}) } as Empresa;
      try {
        localStorage.setItem(CACHE, JSON.stringify(empresa));
      } catch {
        /* ignora */
      }
      return empresa;
    },
    initialData: empresaCacheada,
    staleTime: 60_000,
  });

  return { empresa: query.data ?? EMPRESA_PADRAO, ...query };
}
