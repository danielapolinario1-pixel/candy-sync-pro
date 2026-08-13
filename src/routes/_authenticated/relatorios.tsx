import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { brl, dataHora } from "@/lib/format";
import {
  ATALHOS_PERIODO,
  CORES_PIZZA,
  calcularAnalytics,
  fromInputDate,
  intervaloPorAtalho,
  toInputDate,
  type PeriodoAtalho,
  type PedidoRelatorio,
  type ItemRelatorio,
  type ProdutoCusto,
} from "@/lib/relatorios";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios e Analytics | SSD ATACADO" },
      {
        name: "description",
        content: "Painel financeiro: faturamento, lucro líquido, formas de pagamento e ranking de produtos.",
      },
      { property: "og:title", content: "Relatórios e Analytics | SSD ATACADO" },
      { property: "og:description", content: "KPIs, gráficos e histórico avançado de vendas." },
    ],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const [atalho, setAtalho] = useState<PeriodoAtalho>("mes");
  const inicial = intervaloPorAtalho("mes");
  const [deStr, setDeStr] = useState(toInputDate(inicial.de));
  const [ateStr, setAteStr] = useState(toInputDate(inicial.ate));

  const intervalo = useMemo(() => {
    if (atalho === "custom") {
      return { de: fromInputDate(deStr, false), ate: fromInputDate(ateStr, true) };
    }
    return intervaloPorAtalho(atalho);
  }, [atalho, deStr, ateStr]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["relatorios", intervalo.de.toISOString(), intervalo.ate.toISOString()],
    queryFn: async () => {
      const deIso = intervalo.de.toISOString();
      const ateIso = intervalo.ate.toISOString();

      const { data: pedidos, error: ePedidos } = await supabase
        .from("pedidos")
        .select("id, numero, created_at, cliente_nome, vendedor_nome, condicao_pagamento, total, desconto, subtotal")
        .gte("created_at", deIso)
        .lte("created_at", ateIso)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (ePedidos) throw ePedidos;

      const lista = (pedidos ?? []) as PedidoRelatorio[];
      const ids = lista.map((p) => p.id);

      let itens: ItemRelatorio[] = [];
      if (ids.length) {
        const { data: rows, error: eItens } = await supabase
          .from("pedido_itens")
          .select("pedido_id, produto_id, produto_nome, quantidade, valor_unitario, subtotal, unidades_por_embalagem")
          .in("pedido_id", ids);
        if (eItens) throw eItens;
        itens = (rows ?? []) as ItemRelatorio[];
      }

      const produtoIds = [...new Set(itens.map((i) => i.produto_id).filter(Boolean))] as string[];
      let produtos: ProdutoCusto[] = [];
      if (produtoIds.length) {
        const comCusto = await supabase.from("produtos").select("id, preco, preco_custo").in("id", produtoIds);
        if (comCusto.error && /preco_custo/i.test(comCusto.error.message)) {
          const semCusto = await supabase.from("produtos").select("id, preco").in("id", produtoIds);
          if (semCusto.error) throw semCusto.error;
          produtos = (semCusto.data ?? []).map((p) => ({
            id: p.id,
            preco: Number(p.preco),
            preco_custo: 0,
          }));
        } else if (comCusto.error) {
          throw comCusto.error;
        } else {
          produtos = (comCusto.data ?? []).map((p) => ({
            id: p.id,
            preco: Number(p.preco),
            preco_custo: Number((p as { preco_custo?: number }).preco_custo ?? 0),
          }));
        }
      }

      return calcularAnalytics(lista, itens, produtos, intervalo);
    },
  });

  const aplicarAtalho = (id: Exclude<PeriodoAtalho, "custom">) => {
    const iv = intervaloPorAtalho(id);
    setAtalho(id);
    setDeStr(toInputDate(iv.de));
    setAteStr(toInputDate(iv.ate));
  };

  const pizzaData = (data?.pagamentos ?? []).map((p) => ({
    name: p.nome,
    value: Math.round(p.valor * 100) / 100,
  }));

  return (
    <div>
      <AppHeader titulo="Relatórios" voltarPara="/inicio" />

      <div className="mx-auto max-w-lg space-y-4 px-4 py-4">
        {/* Filtros de período */}
        <section className="rounded-2xl bg-card p-4 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Período</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ATALHOS_PERIODO.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => aplicarAtalho(a.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  atalho === a.id ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">De</label>
              <input
                type="date"
                value={deStr}
                onChange={(e) => {
                  setDeStr(e.target.value);
                  setAtalho("custom");
                }}
                className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">Até</label>
              <input
                type="date"
                value={ateStr}
                onChange={(e) => {
                  setAteStr(e.target.value);
                  setAtalho("custom");
                }}
                className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
        </section>

        {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Carregando indicadores...</p>}
        {isError && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error instanceof Error ? error.message : "Falha ao carregar relatórios"}
          </p>
        )}

        {data && (
          <>
            {/* KPIs */}
            <section className="grid grid-cols-2 gap-3">
              <Kpi titulo="Total Faturado" valor={brl(data.totalFaturado)} destaque />
              <Kpi titulo="Lucro Líquido" valor={brl(data.lucroLiquido)} />
              <Kpi titulo="Total de Pedidos" valor={String(data.totalPedidos)} />
              <Kpi titulo="Ticket Médio" valor={brl(data.ticketMedio)} />
            </section>

            {/* Evolução */}
            <section className="rounded-2xl bg-card p-4 shadow-card">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Evolução — Faturamento e Lucro
              </p>
              {data.evolucao.every((d) => d.faturamento === 0 && d.lucro === 0) ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Sem vendas no período.</p>
              ) : (
                <div className="mt-3 h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.evolucao} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="rotulo" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        width={48}
                        tickFormatter={(v) =>
                          Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(1)}k` : String(Math.round(Number(v)))
                        }
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          brl(value),
                          name === "faturamento" ? "Faturamento" : "Lucro",
                        ]}
                        labelFormatter={(l) => `Dia ${l}`}
                        contentStyle={{ borderRadius: 12, fontSize: 12 }}
                      />
                      <Legend
                        formatter={(v) => (v === "faturamento" ? "Faturamento" : "Lucro")}
                        wrapperStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="faturamento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="lucro" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground">
                Lucro = (preço de venda − preço de custo) × qtd. Cadastre o custo em Produtos.
              </p>
            </section>

            {/* Pizza pagamentos */}
            <section className="rounded-2xl bg-card p-4 shadow-card">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Vendas por Forma de Pagamento
              </p>
              {pizzaData.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Sem dados de pagamento.</p>
              ) : (
                <div className="mt-2 h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pizzaData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={2}
                      >
                        {pizzaData.map((_, i) => (
                          <Cell key={i} fill={CORES_PIZZA[i % CORES_PIZZA.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <ul className="mt-1 space-y-1">
                {(data.pagamentos ?? []).map((p) => (
                  <li key={p.nome} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {p.nome} · {p.pedidos} ped.
                    </span>
                    <span className="font-bold">{brl(p.valor)}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Ranking */}
            <section className="rounded-2xl bg-card p-4 shadow-card">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Produtos Mais Vendidos
              </p>
              <div className="mt-3 space-y-2">
                {data.ranking.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">Nenhum item vendido.</p>
                )}
                {data.ranking.map((r, idx) => (
                  <div key={r.nome} className="flex items-start gap-3 border-b border-border py-2 last:border-0">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-black">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{r.nome}</p>
                      <p className="text-xs text-muted-foreground">Qtd: {r.quantidade}</p>
                    </div>
                    <p className="text-sm font-black text-primary">{brl(r.faturamento)}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Histórico */}
            <section className="rounded-2xl bg-card p-4 shadow-card">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Histórico de Vendas
              </p>
              <div className="mt-3 -mx-1 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-[10px] uppercase text-muted-foreground">
                      <th className="px-2 py-2 font-bold">Pedido</th>
                      <th className="px-2 py-2 font-bold">Data/Hora</th>
                      <th className="px-2 py-2 font-bold">Cliente</th>
                      <th className="px-2 py-2 font-bold">Vendedor</th>
                      <th className="px-2 py-2 font-bold">Pagamento</th>
                      <th className="px-2 py-2 text-right font-bold">Total</th>
                      <th className="px-2 py-2 font-bold" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.historico.map((p) => (
                      <tr key={p.id} className="border-b border-border/70 last:border-0">
                        <td className="px-2 py-2.5 font-bold text-primary">#{p.numero}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap">{dataHora(p.created_at)}</td>
                        <td className="max-w-[8rem] truncate px-2 py-2.5 font-semibold">{p.cliente_nome}</td>
                        <td className="max-w-[7rem] truncate px-2 py-2.5">{p.vendedor_nome}</td>
                        <td className="max-w-[7rem] truncate px-2 py-2.5">
                          {p.condicao_pagamento || "—"}
                        </td>
                        <td className="px-2 py-2.5 text-right font-black">{brl(p.total)}</td>
                        <td className="px-2 py-2.5">
                          <Link
                            to="/pedidos/$id"
                            params={{ id: p.id }}
                            className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 font-bold"
                            title="Ver comprovante"
                          >
                            <Eye className="size-3.5" /> Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.historico.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma venda no período.</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({ titulo, valor, destaque }: { titulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 shadow-card ${destaque ? "bg-primary text-primary-foreground" : "bg-card"}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wide ${destaque ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
        {titulo}
      </p>
      <p className="mt-1 text-lg font-black leading-tight">{valor}</p>
    </div>
  );
}
