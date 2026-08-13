import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PlusCircle, Package, Users, History, Boxes, LogOut, AlertTriangle, ChartColumn, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSessao } from "@/hooks/useSessao";
import { Logo } from "@/components/Logo";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Início | SSD ATACADO" },
      { name: "description", content: "Painel de vendas móvel da SSD Atacado: pedidos, produtos, clientes e estoque." },
      { property: "og:title", content: "Início | SSD ATACADO" },
      { property: "og:description", content: "Pedidos, produtos, clientes e estoque em tempo real." },
    ],
  }),
  component: Inicio,
});

const botoes = [
  { to: "/pedidos/novo", label: "NOVO PEDIDO", Icon: PlusCircle, destaque: true },
  { to: "/relatorios", label: "RELATÓRIOS E ANALYTICS", Icon: ChartColumn },
  { to: "/produtos", label: "PRODUTOS", Icon: Package },
  { to: "/clientes", label: "CLIENTES", Icon: Users },
  { to: "/pedidos", label: "HISTÓRICO DE PEDIDOS", Icon: History },
  { to: "/estoque", label: "ESTOQUE", Icon: Boxes },
  { to: "/configuracoes", label: "CONFIGURAÇÕES", Icon: Settings },
];

function Inicio() {
  const { sessao } = useSessao();
  const navigate = useNavigate();

  const { data: resumo } = useQuery({
    queryKey: ["produtos", "resumo-inicio"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("estoque_atual, estoque_minimo");
      if (error) throw error;
      return {
        total: data.length,
        criticos: data.filter((p) => Number(p.estoque_atual) <= Number(p.estoque_minimo)).length,
      };
    },
  });

  const { data: hoje } = useQuery({
    queryKey: ["pedidos", "hoje"],
    queryFn: async () => {
      const inicioDia = new Date();
      inicioDia.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("pedidos")
        .select("total")
        .gte("created_at", inicioDia.toISOString());
      if (error) throw error;
      return { qtd: data.length, valor: data.reduce((s, p) => s + Number(p.total), 0) };
    },
  });

  async function sair() {
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="bg-ink px-5 pb-8 pt-6 text-ink-foreground safe-top">
        <div className="mx-auto max-w-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="rounded-xl bg-white p-2">
              <Logo className="h-12" />
            </div>
            <button onClick={sair} className="rounded-full bg-white/10 p-3 active:bg-white/20" aria-label="Sair">
              <LogOut className="size-5" />
            </button>
          </div>
          <div className="mt-4">
            <p className="text-xs uppercase tracking-widest text-white/50">Bem-vindo</p>
            <h1 className="text-2xl font-black">{sessao?.nome ?? "Vendedor"}</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto -mt-5 max-w-lg px-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card p-4 shadow-card">
            <p className="text-xs font-semibold text-muted-foreground">VENDAS HOJE</p>
            <p className="mt-1 text-xl font-black">{brl(hoje?.valor ?? 0)}</p>
            <p className="text-xs text-muted-foreground">{hoje?.qtd ?? 0} pedido(s)</p>
          </div>
          <div className="rounded-2xl bg-card p-4 shadow-card">
            <p className="text-xs font-semibold text-muted-foreground">PRODUTOS</p>
            <p className="mt-1 text-xl font-black">{resumo?.total ?? 0}</p>
            {(resumo?.criticos ?? 0) > 0 ? (
              <p className="flex items-center gap-1 text-xs font-bold text-primary">
                <AlertTriangle className="size-3" /> {resumo?.criticos} em falta
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">estoque ok</p>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {botoes.map(({ to, label, Icon, destaque }) => (
            <Link
              key={to}
              to={to}
              className={`flex h-20 items-center gap-4 rounded-2xl px-5 text-lg font-extrabold tracking-tight active:scale-[0.99] ${
                destaque
                  ? "bg-primary text-primary-foreground shadow-float"
                  : "bg-card text-foreground shadow-card"
              }`}
            >
              <Icon className="size-7 shrink-0" strokeWidth={2.4} />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
