import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, AlertTriangle, ArrowDownCircle, ArrowUpCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { dataHora } from "@/lib/format";
import { useSessao } from "@/hooks/useSessao";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque | SSD ATACADO" },
      { name: "description", content: "Estoque central em tempo real com entradas, ajustes, histórico e alertas de mínimo." },
      { property: "og:title", content: "Estoque | SSD ATACADO" },
      { property: "og:description", content: "Controle do estoque central compartilhado em tempo real." },
    ],
  }),
  component: Estoque,
});

type Produto = Tables<"produtos">;

function Estoque() {
  const qc = useQueryClient();
  const { sessao } = useSessao();
  const [aba, setAba] = useState<"itens" | "historico">("itens");
  const [busca, setBusca] = useState("");
  const [somenteCriticos, setSomenteCriticos] = useState(false);
  const [mov, setMov] = useState<{ produto: Produto; tipo: "entrada" | "ajuste" } | null>(null);
  const [quantidade, setQuantidade] = useState("");
  const [motivo, setMotivo] = useState("");

  const { data: produtos = [] } = useQuery({
    queryKey: ["estoque", "produtos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("*").order("nome").limit(500);
      if (error) throw error;
      return data as Produto[];
    },
  });

  const { data: movimentos = [] } = useQuery({
    queryKey: ["movimentacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimentacoes_estoque")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(150);
      if (error) throw error;
      return data as Tables<"movimentacoes_estoque">[];
    },
  });

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return produtos.filter((p) => {
      const okBusca = !t || p.nome.toLowerCase().includes(t) || (p.codigo ?? "").toLowerCase().includes(t);
      const critico = Number(p.estoque_atual) <= Number(p.estoque_minimo);
      return okBusca && (!somenteCriticos || critico);
    });
  }, [produtos, busca, somenteCriticos]);

  const registrar = useMutation({
    mutationFn: async () => {
      if (!mov) return;
      const q = Number(quantidade.replace(",", ".")) || 0;
      const atual = Number(mov.produto.estoque_atual);
      const novo = mov.tipo === "entrada" ? atual + q : q;
      const { error } = await supabase.from("produtos").update({ estoque_atual: novo }).eq("id", mov.produto.id);
      if (error) throw error;
      const { error: e2 } = await supabase.from("movimentacoes_estoque").insert({
        produto_id: mov.produto.id,
        produto_nome: mov.produto.nome,
        tipo: mov.tipo,
        quantidade: mov.tipo === "entrada" ? q : novo - atual,
        saldo_apos: novo,
        motivo: motivo || (mov.tipo === "entrada" ? "Entrada manual" : "Ajuste de estoque"),
        usuario_nome: sessao?.nome ?? null,
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Estoque atualizado");
      setMov(null);
      setQuantidade("");
      setMotivo("");
      void qc.invalidateQueries({ queryKey: ["estoque"] });
      void qc.invalidateQueries({ queryKey: ["produtos"] });
      void qc.invalidateQueries({ queryKey: ["movimentacoes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AppHeader titulo="Estoque central" voltarPara="/inicio" />
      <div className="mx-auto max-w-lg px-4 py-4">
        <div className="flex gap-2 rounded-xl bg-secondary p-1">
          {(["itens", "historico"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={`flex-1 rounded-lg py-2 text-sm font-bold ${
                aba === a ? "bg-card shadow-card" : "text-muted-foreground"
              }`}
            >
              {a === "itens" ? "Itens" : "Movimentações"}
            </button>
          ))}
        </div>

        {aba === "itens" ? (
          <>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar produto"
                className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={() => setSomenteCriticos(!somenteCriticos)}
              className={`mt-3 w-full rounded-xl py-3 text-sm font-bold ${
                somenteCriticos ? "bg-primary text-primary-foreground" : "bg-secondary"
              }`}
            >
              <AlertTriangle className="mr-1 inline size-4" /> Somente estoque mínimo atingido
            </button>

            <div className="mt-3 space-y-2">
              {lista.map((p) => {
                const critico = Number(p.estoque_atual) <= Number(p.estoque_minimo);
                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl p-4 shadow-card ${critico ? "bg-primary/5 ring-1 ring-primary" : "bg-card"}`}
                  >
                    <p className="font-bold leading-tight">{p.nome}</p>
                    <p className={`text-sm font-semibold ${critico ? "text-primary" : "text-muted-foreground"}`}>
                      Saldo: {Number(p.estoque_atual)} {p.unidade} • mínimo {Number(p.estoque_minimo)}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setMov({ produto: p, tipo: "entrada" })}
                        className="flex-1 rounded-lg bg-success/10 py-2 text-sm font-bold text-success"
                      >
                        <ArrowUpCircle className="mr-1 inline size-4" /> Entrada
                      </button>
                      <button
                        onClick={() => setMov({ produto: p, tipo: "ajuste" })}
                        className="flex-1 rounded-lg bg-secondary py-2 text-sm font-bold"
                      >
                        <ArrowDownCircle className="mr-1 inline size-4" /> Ajustar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mt-3 space-y-2">
            {movimentos.map((m) => (
              <div key={m.id} className="rounded-2xl bg-card p-4 shadow-card">
                <div className="flex justify-between">
                  <p className="flex-1 font-bold leading-tight">{m.produto_nome}</p>
                  <span
                    className={`text-lg font-black ${m.tipo === "saida" ? "text-primary" : "text-success"}`}
                  >
                    {m.tipo === "saida" ? "-" : "+"}
                    {Math.abs(Number(m.quantidade))}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {dataHora(m.created_at)} • {m.motivo} • saldo {Number(m.saldo_apos)}
                  {m.usuario_nome ? ` • ${m.usuario_nome}` : ""}
                </p>
              </div>
            ))}
            {movimentos.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">Sem movimentações.</p>
            )}
          </div>
        )}
      </div>

      {mov && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={() => setMov(null)}>
          <div className="w-full rounded-t-3xl bg-card p-5 safe-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto max-w-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-black leading-tight">{mov.produto.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {mov.tipo === "entrada" ? "Entrada de mercadoria" : "Ajuste de saldo"} • atual{" "}
                    {Number(mov.produto.estoque_atual)}
                  </p>
                </div>
                <button onClick={() => setMov(null)} aria-label="Fechar">
                  <X className="size-6" />
                </button>
              </div>
              <input
                autoFocus
                inputMode="decimal"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder={mov.tipo === "entrada" ? "Quantidade a somar" : "Novo saldo"}
                className="mt-4 h-14 w-full rounded-xl border border-border px-4 text-lg outline-none focus:border-primary"
              />
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo (opcional)"
                className="mt-3 h-13 w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary"
              />
              <button
                onClick={() => registrar.mutate()}
                disabled={registrar.isPending || !quantidade}
                className="mt-4 h-14 w-full rounded-xl bg-primary text-lg font-extrabold text-primary-foreground shadow-float disabled:opacity-50"
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
