import {
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export type PeriodoAtalho = "hoje" | "ontem" | "7dias" | "mes" | "mes_passado" | "custom";

export type IntervaloDatas = { de: Date; ate: Date };

export function intervaloPorAtalho(atalho: Exclude<PeriodoAtalho, "custom">, agora = new Date()): IntervaloDatas {
  switch (atalho) {
    case "hoje":
      return { de: startOfDay(agora), ate: endOfDay(agora) };
    case "ontem": {
      const d = subDays(agora, 1);
      return { de: startOfDay(d), ate: endOfDay(d) };
    }
    case "7dias":
      return { de: startOfDay(subDays(agora, 6)), ate: endOfDay(agora) };
    case "mes":
      return { de: startOfMonth(agora), ate: endOfDay(agora) };
    case "mes_passado": {
      const ref = subMonths(agora, 1);
      return { de: startOfMonth(ref), ate: endOfMonth(ref) };
    }
  }
}

export function toInputDate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function fromInputDate(s: string, fimDoDia = false) {
  const [y, m, day] = s.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, day || 1);
  return fimDoDia ? endOfDay(d) : startOfDay(d);
}

export function rotuloDia(isoOuDate: string | Date) {
  const d = typeof isoOuDate === "string" ? new Date(isoOuDate) : isoOuDate;
  return format(d, "dd/MM", { locale: ptBR });
}

export function chaveDia(iso: string) {
  return format(new Date(iso), "yyyy-MM-dd");
}

/** Normaliza texto livre de condição de pagamento para agrupamento no gráfico. */
export function normalizarPagamento(raw: string | null | undefined): string {
  const t = (raw || "").trim().toLowerCase();
  if (!t) return "Não informado";
  if (/\bpix\b/.test(t)) return "PIX";
  if (/dinheiro|especie|espécie|cash/.test(t)) return "Dinheiro";
  if (/cr[eé]dito|credito/.test(t)) return "Cartão de Crédito";
  if (/d[eé]bito|debito/.test(t)) return "Cartão de Débito";
  if (/cart[aã]o|cartao|card/.test(t)) return "Cartão";
  if (/boleto/.test(t)) return "Boleto";
  if (/transfer|ted|doc/.test(t)) return "Transferência";
  if (/prazo|fiado|a prazo|parcel/.test(t)) return "A prazo";
  return raw!.trim();
}

export type PedidoRelatorio = {
  id: string;
  numero: number;
  created_at: string;
  cliente_nome: string;
  vendedor_nome: string;
  condicao_pagamento: string | null;
  total: number;
  desconto: number;
  subtotal: number;
};

export type ItemRelatorio = {
  pedido_id: string;
  produto_id: string | null;
  produto_nome: string;
  quantidade: number;
  valor_unitario: number;
  subtotal: number;
  unidades_por_embalagem: number;
};

export type ProdutoCusto = {
  id: string;
  preco: number;
  preco_custo: number | null;
};

export type AnalyticsResultado = {
  totalFaturado: number;
  lucroLiquido: number;
  totalPedidos: number;
  ticketMedio: number;
  evolucao: { dia: string; rotulo: string; faturamento: number; lucro: number }[];
  pagamentos: { nome: string; valor: number; pedidos: number }[];
  ranking: { nome: string; quantidade: number; faturamento: number }[];
  historico: PedidoRelatorio[];
};

function custoUnitario(item: ItemRelatorio, custos: Map<string, ProdutoCusto>): number {
  if (!item.produto_id) return 0;
  const p = custos.get(item.produto_id);
  if (!p) return 0;
  const custo = Number(p.preco_custo ?? 0);
  // Se a venda foi por embalagem (qtd = embalagens), o custo unitário do item é custo da unidade × unidades na embalagem.
  const fator = Number(item.unidades_por_embalagem) > 1 ? Number(item.unidades_por_embalagem) : 1;
  return custo * fator;
}

export function calcularAnalytics(
  pedidos: PedidoRelatorio[],
  itens: ItemRelatorio[],
  produtos: ProdutoCusto[],
  intervalo: IntervaloDatas,
): AnalyticsResultado {
  const custos = new Map(produtos.map((p) => [p.id, p]));
  const itensPorPedido = new Map<string, ItemRelatorio[]>();
  for (const i of itens) {
    const lista = itensPorPedido.get(i.pedido_id) ?? [];
    lista.push(i);
    itensPorPedido.set(i.pedido_id, lista);
  }

  const totalFaturado = pedidos.reduce((s, p) => s + Number(p.total), 0);
  const totalPedidos = pedidos.length;
  const ticketMedio = totalPedidos ? totalFaturado / totalPedidos : 0;

  let lucroLiquido = 0;
  const lucroPorDia = new Map<string, number>();
  const fatPorDia = new Map<string, number>();
  const pagMap = new Map<string, { valor: number; pedidos: number }>();
  const rankMap = new Map<string, { quantidade: number; faturamento: number }>();

  for (const p of pedidos) {
    const dia = chaveDia(p.created_at);
    fatPorDia.set(dia, (fatPorDia.get(dia) ?? 0) + Number(p.total));

    const pag = normalizarPagamento(p.condicao_pagamento);
    const atualPag = pagMap.get(pag) ?? { valor: 0, pedidos: 0 };
    atualPag.valor += Number(p.total);
    atualPag.pedidos += 1;
    pagMap.set(pag, atualPag);

    const doPedido = itensPorPedido.get(p.id) ?? [];
    let lucroPedido = 0;
    for (const i of doPedido) {
      const custo = custoUnitario(i, custos);
      const lucroItem = (Number(i.valor_unitario) - custo) * Number(i.quantidade);
      lucroPedido += lucroItem;
      lucroLiquido += lucroItem;

      const nome = i.produto_nome || "Produto";
      const r = rankMap.get(nome) ?? { quantidade: 0, faturamento: 0 };
      r.quantidade += Number(i.quantidade);
      r.faturamento += Number(i.subtotal);
      rankMap.set(nome, r);
    }
    // Rateia desconto do pedido no lucro (proporcional ao subtotal dos itens)
    if (Number(p.desconto) > 0) {
      lucroPedido -= Number(p.desconto);
      lucroLiquido -= Number(p.desconto);
    }
    lucroPorDia.set(dia, (lucroPorDia.get(dia) ?? 0) + lucroPedido);
  }

  // Preenche todos os dias do intervalo para o gráfico contínuo
  const evolucao: AnalyticsResultado["evolucao"] = [];
  const cursor = startOfDay(intervalo.de);
  const fim = startOfDay(intervalo.ate);
  while (cursor <= fim) {
    const chave = format(cursor, "yyyy-MM-dd");
    evolucao.push({
      dia: chave,
      rotulo: format(cursor, "dd/MM", { locale: ptBR }),
      faturamento: fatPorDia.get(chave) ?? 0,
      lucro: lucroPorDia.get(chave) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const pagamentos = [...pagMap.entries()]
    .map(([nome, v]) => ({ nome, valor: v.valor, pedidos: v.pedidos }))
    .sort((a, b) => b.valor - a.valor);

  const ranking = [...rankMap.entries()]
    .map(([nome, v]) => ({ nome, quantidade: v.quantidade, faturamento: v.faturamento }))
    .sort((a, b) => b.quantidade - a.quantidade || b.faturamento - a.faturamento)
    .slice(0, 15);

  const historico = [...pedidos].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return {
    totalFaturado,
    lucroLiquido,
    totalPedidos,
    ticketMedio,
    evolucao,
    pagamentos,
    ranking,
    historico,
  };
}

export const ATALHOS_PERIODO: { id: Exclude<PeriodoAtalho, "custom">; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "7dias", label: "Últimos 7 dias" },
  { id: "mes", label: "Este Mês" },
  { id: "mes_passado", label: "Mês Passado" },
];

export const CORES_PIZZA = [
  "hsl(var(--primary))",
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#64748b",
  "#14b8a6",
];
