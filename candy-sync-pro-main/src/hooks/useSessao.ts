import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Sessao {
  userId: string;
  email: string;
  nome: string;
}

export function useSessao() {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function carregarPerfil(userId: string, email: string, nomeAuth?: string) {
      const { data } = await supabase.from("profiles").select("nome").eq("id", userId).maybeSingle();
      if (!ativo) return;
      setSessao({ userId, email, nome: data?.nome || nomeAuth || email.split("@")[0] || "Vendedor" });
      setCarregando(false);
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!ativo) return;
      if (data.user) {
        const nomeAuth = typeof data.user.user_metadata["nome"] === "string" ? data.user.user_metadata["nome"] : undefined;
        void carregarPerfil(data.user.id, data.user.email ?? "", nomeAuth);
      }
      else {
        setSessao(null);
        setCarregando(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (s?.user) {
        const nomeAuth = typeof s.user.user_metadata["nome"] === "string" ? s.user.user_metadata["nome"] : undefined;
        void carregarPerfil(s.user.id, s.user.email ?? "", nomeAuth);
      } else {
        setSessao(null);
        setCarregando(false);
      }
    });

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { sessao, carregando };
}
