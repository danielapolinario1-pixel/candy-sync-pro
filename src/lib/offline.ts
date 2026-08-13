import { supabase } from "@/integrations/supabase/client";

export interface ItemPedidoOffline {
  produto_id: string;
  produto_nome: string;
  produto_codigo: string | null;
  unidade: string;
  embalagem: string;
  unidades_por_embalagem: number;
  quantidade: number;
  valor_unitario: number;
  subtotal: number;
}

export interface PedidoOffline {
  local_id: string;
  numero: number;
  created_at: string;
  cliente_id: string | null;
  cliente_nome: string;
  vendedor_id: string;
  vendedor_nome: string;
  subtotal: number;
  desconto: number;
  total: number;
  observacoes: string | null;
  condicao_pagamento: string;
  itens: ItemPedidoOffline[];
}

const FILA = "ssd:fila-pedidos";
const CACHE = "ssd:cache";

function ler<T>(chave: string, padrao: T): T {
  try {
    const raw = localStorage.getItem(chave);
    return raw ? (JSON.parse(raw) as T) : padrao;
  } catch {
    return padrao;
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* cota cheia */
  }
}

export const estaOnline = () => (typeof navigator === "undefined" ? true : navigator.onLine);

/** Cache genérico de listas (clientes, produtos) para uso sem internet. */
export function salvarCache<T>(nome: string, dados: T) {
  gravar(`${CACHE}:${nome}`, dados);
}
export function lerCache<T>(nome: string, padrao: T): T {
  return ler<T>(`${CACHE}:${nome}`, padrao);
}

export function filaPedidos(): PedidoOffline[] {
  return ler<PedidoOffline[]>(FILA, []);
}

export function pedidoOfflinePorId(localId: string) {
  return filaPedidos().find((p) => p.local_id === localId) ?? null;
}

export function enfileirarPedido(pedido: Omit<PedidoOffline, "local_id" | "numero" | "created_at">) {
  const fila = filaPedidos();
  const proximoNumero = 9000 + fila.length + 1;
  const completo: PedidoOffline = {
    ...pedido,
    local_id: `local-${Date.now()}`,
    numero: proximoNumero,
    created_at: new Date().toISOString(),
  };
  gravar(FILA, [...fila, completo]);
  return completo;
}

function removerDaFila(localId: string) {
  gravar(
    FILA,
    filaPedidos().filter((p) => p.local_id !== localId),
  );
}

/** Envia os pedidos criados offline assim que houver internet. */
export async function sincronizarPedidos(): Promise<number> {
  if (!estaOnline()) return 0;
  const fila = filaPedidos();
  let enviados = 0;
  for (const p of fila) {
    try {
      const { data: pedido, error } = await supabase
        .from("pedidos")
        .insert({
          cliente_id: p.cliente_id,
          cliente_nome: p.cliente_nome,
          vendedor_id: p.vendedor_id,
          vendedor_nome: p.vendedor_nome,
          subtotal: p.subtotal,
          desconto: p.desconto,
          total: p.total,
          observacoes: p.observacoes,
          condicao_pagamento: p.condicao_pagamento,
          created_at: p.created_at,
        })
        .select()
        .single();
      if (error) throw error;
      const { error: e2 } = await supabase.from("pedido_itens").insert(
        p.itens.map((i) => ({
          pedido_id: pedido.id,
          produto_id: i.produto_id,
          produto_nome: i.produto_nome,
          produto_codigo: i.produto_codigo,
          unidade: i.unidade,
          embalagem: i.embalagem,
          unidades_por_embalagem: i.unidades_por_embalagem,
          quantidade: i.quantidade,
          valor_unitario: i.valor_unitario,
          subtotal: i.subtotal,
        })),
      );
      if (e2) throw e2;
      removerDaFila(p.local_id);
      enviados += 1;
    } catch {
      break; // tenta novamente na próxima conexão
    }
  }
  return enviados;
}
