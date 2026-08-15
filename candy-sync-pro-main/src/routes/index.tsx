import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
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
  beforeLoad: () => {
    throw redirect({ to: "/inicio" });
  },
});
