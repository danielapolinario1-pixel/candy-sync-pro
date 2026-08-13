import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "SSD ATACADO | Vendas e Estoque" },
      { name: "description", content: "Acesse o aplicativo móvel de vendas, pedidos e estoque da SSD Atacado." },
      { property: "og:title", content: "SSD ATACADO | Vendas e Estoque" },
      { property: "og:description", content: "Acesse o aplicativo móvel de vendas, pedidos e estoque da SSD Atacado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) throw redirect({ to: "/inicio" });
    throw redirect({ to: "/auth" });
  },
});
