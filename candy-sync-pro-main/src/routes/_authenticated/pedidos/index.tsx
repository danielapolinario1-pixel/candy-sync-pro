import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { brl, dataHora } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/pedidos/")({
  head: () => ({
    meta: [
      { title: "Pedidos | SSD ATACADO" },
      { name: "description", content: "Histórico de pedidos de venda da SSD Atacado com PDF e envio por WhatsApp." },
      { property: "og:title", content: "Pedidos | SSD ATACADO" },
      { property: "og:description", content: "Histórico de pedidos, PDF profissional e envio por WhatsApp." },
    ],
  }),
  component: Pedidos,
});

function Pedidos() {
  const { data: pedidos = [] } = useQuery({
    queryKey: ["pedidos", "lista"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Tables<"pedidos">[];
    },
  });

  return (
    <div>
      <AppHeader
        titulo="Pedidos"
        voltarPara="/inicio"
        acao={
          <Link to="/pedidos/novo" className="rounded-full bg-primary p-2 text-primary-foreground">
            <Plus className="size-6" />
          </Link>
        }
      />
      <div className="mx-auto max-w-lg px-4 py-4">
        <Link
          to="/pedidos/novo"
          className="mb-4 flex h-16 items-center justify-center rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground shadow-float"
        >
          NOVO PEDIDO
        </Link>

        <div className="space-y-2">
          {pedidos.map((p) => (
            <Link
              key={p.id}
              to="/pedidos/$id"
              params={{ id: p.id }}
              className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-primary">PEDIDO #{p.numero}</p>
                <p className="truncate text-base font-bold">{p.cliente_nome}</p>
                <p className="text-xs text-muted-foreground">
                  {dataHora(p.created_at)} • {p.vendedor_nome}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black">{brl(p.total)}</p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Link>
          ))}
          {pedidos.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum pedido registrado ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
