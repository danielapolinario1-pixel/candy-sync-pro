import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Minus, Plus, Trash2, X, Check, AlertTriangle, ClipboardCheck, Copy, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Logo } from "@/components/Logo";
import { brl, EMBALAGENS, precoUnitario } from "@/lib/format";
import { useSessao } from "@/hooks/useSessao";
import { useEmpresa } from "@/hooks/useEmpresa";
import { cidadeUf, enderecoCompleto } from "@/lib/empresa";
import { enfileirarPedido, estaOnline, lerCache, salvarCache } from "@/lib/offline";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/pedidos/novo")({
  head: () => ({
    meta: [
      { title: "Novo pedido | SSD ATACADO" },
      {
        name: "description",
        content: "Monte um pedido com venda por embalagem, conferência completa e baixa automática de estoque.",
      },
      { property: "og:title", content: "Novo pedido | SSD ATACADO" },
      { property: "og:description", content: "Pedido rápido, conferência e baixa automática no estoque central." },
    ],
  }),
  component: NovoPedido,
});

type Produto = Tables<"produtos">;
type Cliente = Tables<"clientes">;

interface Item {
  produto_id: string;
  produto_nome: string;
  produto_codigo: string | null;
  unidade: string;
  embalagem: string;
  unidades_por_embalagem: number;
  quantidade: number;
  valor_unitario: number;
}

function NovoPedido() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { sessao } = useSessao();
  const { empresa } = useEmpresa();
  const buscaRef = useRef<HTMLInputElement>(null);

  const [etapa, setEtapa] = useState<"cliente" | "produtos" | "conferencia">("cliente");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [busca, setBusca] = useState("");
  const [itens, setItens] = useState<Item[]>([]);
  const [modal, setModal] = useState<Produto | null>(null);
  const [qtd, setQtd] = useState(1);
  const [embalagem, setEmbalagem] = useState<string>("Unidade");
  const [desconto, setDesconto] = useState("0");
  const [observacoes, setObservacoes] = useState("");
  const [condicao, setCondicao] = useState("A combinar");
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const atualizar = () => setOnline(estaOnline());
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => {
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
    };
  }, []);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").order("razao_social");
      if (error) throw error;
      salvarCache("clientes", data);
      return data as Cliente[];
    },
    initialData: () => lerCache<Cliente[]>("clientes", []),
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos", "busca-pedido", busca],
    queryFn: async () => {
      let query = supabase.from("produtos").select("*");
      const t = busca.trim();
      if (t) query = query.or(`nome.ilike.%${t}%,codigo.ilike.%${t}%,codigo_barras.ilike.%${t}%`);
      const { data, error } = await query.order("favorito", { ascending: false }).order("nome").limit(40);
      if (error) throw error;
      if (!t) salvarCache("produtos", data);
      return data as Produto[];
    },
    placeholderData: (anterior) => anterior,
  });

  const produtosOffline = useMemo(() => {
    if (online) return produtos;
    const cache = lerCache<Produto[]>("produtos", []);
    const t = busca.trim().toLowerCase();
    if (!t) return cache.slice(0, 40);
    return cache
      .filter((p) =>
        [p.nome, p.codigo, p.codigo_barras].filter(Boolean).some((v) => String(v).toLowerCase().includes(t)),
      )
      .slice(0, 40);
  }, [online, produtos, busca]);

  const clientesFiltrados = useMemo(() => {
    const t = buscaCliente.trim().toLowerCase();
    if (!t) return clientes;
    return clientes.filter((c) =>
      [c.razao_social, c.nome_fantasia, c.cidade].filter(Boolean).some((v) => (v as string).toLowerCase().includes(t)),
    );
  }, [clientes, buscaCliente]);

  const subtotal = itens.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0);
  const totalItens = itens.reduce((s, i) => s + i.quantidade, 0);
  const descontoNum = Number(desconto.replace(",", ".")) || 0;
  const total = Math.max(0, subtotal - descontoNum);

  function unidadesDaEmbalagem(p: Produto, tipo: string) {
    if (tipo === "Unidade") return 1;
    return Number(p.unidades_embalagem) > 0 ? Number(p.unidades_embalagem) : 1;
  }

  function valorDaEmbalagem(p: Produto, tipo: string) {
    const unidades = unidadesDaEmbalagem(p, tipo);
    if (tipo === "Unidade") {
      const un = Number(p.preco) || precoUnitario(Number(p.preco_embalagem), Number(p.unidades_embalagem));
      return un;
    }
    if (Number(p.preco_embalagem) > 0 && tipo === (p.tipo_embalagem ?? "Unidade")) return Number(p.preco_embalagem);
    return Math.round(Number(p.preco) * unidades * 100) / 100;
  }

  function fecharTeclado() {
    const el = document.activeElement as HTMLElement | null;
    el?.blur?.();
  }

  function abrirProduto(p: Produto) {
    fecharTeclado();
    setModal(p);
    setQtd(1);
    setEmbalagem(Number(p.unidades_embalagem) > 1 ? (p.tipo_embalagem ?? "Unidade") : "Unidade");
  }

  function adicionar() {
    if (!modal) return;
    const unidades = unidadesDaEmbalagem(modal, embalagem);
    const valor = valorDaEmbalagem(modal, embalagem);
    setItens((atual) => {
      const idx = atual.findIndex((i) => i.produto_id === modal.id && i.embalagem === embalagem);
      if (idx >= 0) {
        const copia = [...atual];
        copia[idx] = { ...copia[idx]!, quantidade: copia[idx]!.quantidade + qtd };
        return copia;
      }
      return [
        ...atual,
        {
          produto_id: modal.id,
          produto_nome: modal.nome,
          produto_codigo: modal.codigo,
          unidade: modal.unidade,
          embalagem,
          unidades_por_embalagem: unidades,
          quantidade: qtd,
          valor_unitario: valor,
        },
      ];
    });
    setModal(null);
    setQtd(1);
    setBusca("");
    // volta automaticamente para a pesquisa
    setTimeout(() => buscaRef.current?.focus(), 80);
  }

  const duplicarUltimo = useMutation({
    mutationFn: async () => {
      if (!cliente) throw new Error("Selecione um cliente");
      const { data: pedido, error } = await supabase
        .from("pedidos")
        .select("id")
        .eq("cliente_id", cliente.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!pedido) throw new Error("Este cliente ainda não tem pedidos anteriores");
      const { data: itensAnteriores, error: e2 } = await supabase
        .from("pedido_itens")
        .select("*")
        .eq("pedido_id", pedido.id);
      if (e2) throw e2;
      return itensAnteriores;
    },
    onSuccess: (anteriores) => {
      setItens(
        anteriores.map((i) => ({
          produto_id: i.produto_id ?? "",
          produto_nome: i.produto_nome,
          produto_codigo: i.produto_codigo,
          unidade: i.unidade,
          embalagem: i.embalagem ?? "Unidade",
          unidades_por_embalagem: Number(i.unidades_por_embalagem ?? 1),
          quantidade: Number(i.quantidade),
          valor_unitario: Number(i.valor_unitario),
        })),
      );
      toast.success("Último pedido do cliente duplicado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const finalizar = useMutation({
    mutationFn: async () => {
      if (!cliente) throw new Error("Selecione um cliente");
      if (itens.length === 0) throw new Error("Adicione ao menos um produto");
      if (!sessao) throw new Error("Sessão expirada");

      const base = {
        cliente_id: cliente.id,
        cliente_nome: cliente.razao_social,
        vendedor_id: sessao.userId,
        vendedor_nome: sessao.nome,
        subtotal,
        desconto: descontoNum,
        total,
        observacoes: observacoes || null,
        condicao_pagamento: condicao,
      };
      const linhas = itens.map((i) => ({
        produto_id: i.produto_id,
        produto_nome: i.produto_nome,
        produto_codigo: i.produto_codigo,
        unidade: i.unidade,
        embalagem: i.embalagem,
        unidades_por_embalagem: i.unidades_por_embalagem,
        quantidade: i.quantidade,
        valor_unitario: i.valor_unitario,
        subtotal: i.quantidade * i.valor_unitario,
      }));

      if (!estaOnline()) {
        const offline = enfileirarPedido({ ...base, itens: linhas });
        return offline.local_id;
      }

      const { data: pedido, error } = await supabase.from("pedidos").insert(base).select().single();
      if (error) throw error;

      const { error: erroItens } = await supabase
        .from("pedido_itens")
        .insert(linhas.map((i) => ({ ...i, pedido_id: pedido.id })));
      if (erroItens) throw erroItens;
      return pedido.id;
    },
    onSuccess: async (id) => {
      toast.success(
        id.startsWith("local-")
          ? "Pedido salvo no aparelho. Será enviado quando houver internet."
          : "Pedido finalizado! Estoque atualizado.",
      );
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
      void qc.invalidateQueries({ queryKey: ["produtos"] });
      await navigate({ to: "/pedidos/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* ---------- Etapa 1: cliente ---------- */
  if (etapa === "cliente") {
    return (
      <div>
        <AppHeader titulo="Selecionar cliente" voltarPara="/inicio" />
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={buscaCliente}
              onChange={(e) => setBuscaCliente(e.target.value)}
              placeholder="Buscar cliente"
              className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 outline-none focus:border-primary"
            />
          </div>
          <div className="mt-3 space-y-2">
            {clientesFiltrados.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setCliente(c);
                  setEtapa("produtos");
                }}
                className="w-full rounded-2xl bg-card p-4 text-left shadow-card active:bg-secondary"
              >
                <p className="font-bold">{c.razao_social}</p>
                <p className="text-sm text-muted-foreground">
                  {[c.nome_fantasia, c.cidade].filter(Boolean).join(" • ") || "—"}
                </p>
              </button>
            ))}
            {clientesFiltrados.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum cliente. Cadastre um em Clientes.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Etapa 3: conferência ---------- */
  if (etapa === "conferencia") {
    return (
      <div className="pb-40">
        <AppHeader titulo="Conferência do pedido" />
        <div className="mx-auto max-w-lg space-y-3 px-4 py-4">
          <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card">
            <Logo className="h-12" />
            <div className="min-w-0 text-xs text-muted-foreground">
              <p className="truncate text-sm font-black text-foreground">{empresa.razao_social}</p>
              {empresa.cnpj && <p>CNPJ: {empresa.cnpj}</p>}
              <p className="truncate">{enderecoCompleto(empresa) || "—"}</p>
              <p className="truncate">{cidadeUf(empresa)}</p>
              <p>{empresa.telefone || empresa.whatsapp}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-card p-4 shadow-card">
            <p className="text-xs font-bold text-primary">CLIENTE</p>
            <p className="text-lg font-black leading-tight">{cliente?.razao_social}</p>
            <p className="text-sm text-muted-foreground">
              {[cliente?.nome_fantasia, cliente?.documento, cliente?.cidade].filter(Boolean).join(" • ") || "—"}
            </p>
            <p className="text-sm text-muted-foreground">{cliente?.telefone}</p>
          </div>

          <div className="rounded-2xl bg-card p-4 shadow-card">
            <p className="mb-2 text-xs font-bold text-muted-foreground">PRODUTOS</p>
            {itens.map((i) => (
              <div key={`${i.produto_id}-${i.embalagem}`} className="border-b border-border py-2 last:border-0">
                <p className="text-sm font-bold leading-tight">{i.produto_nome}</p>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {i.quantidade} {i.embalagem}
                    {i.unidades_por_embalagem > 1 ? ` (${i.unidades_por_embalagem} ${i.unidade})` : ""} ×{" "}
                    {brl(i.valor_unitario)}
                  </span>
                  <span className="font-bold text-foreground">{brl(i.quantidade * i.valor_unitario)}</span>
                </div>
              </div>
            ))}
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{brl(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Desconto</span>
                <span>{brl(descontoNum)}</span>
              </div>
              <div className="mt-2 flex justify-between rounded-xl bg-primary px-3 py-2 text-primary-foreground">
                <span className="font-bold">TOTAL</span>
                <span className="text-lg font-black">{brl(total)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-card p-4 text-sm shadow-card">
            <p className="text-xs font-bold text-muted-foreground">CONDIÇÃO DE PAGAMENTO</p>
            <p className="font-semibold">{condicao || "A combinar"}</p>
            <p className="mt-2 text-xs font-bold text-muted-foreground">OBSERVAÇÕES</p>
            <p className="font-semibold">{observacoes || "—"}</p>
          </div>

          <button
            onClick={() => setEtapa("produtos")}
            className="h-12 w-full rounded-xl bg-secondary font-bold"
          >
            VOLTAR E CORRIGIR
          </button>
        </div>

        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-card px-4 py-3 shadow-card safe-bottom">
          <div className="mx-auto max-w-lg">
            <button
              onClick={() => finalizar.mutate()}
              disabled={finalizar.isPending}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-extrabold text-primary-foreground shadow-float disabled:opacity-50"
            >
              <Check className="size-5" /> FINALIZAR PEDIDO
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Etapa 2: produtos ---------- */
  return (
    <div className="pb-40">
      <AppHeader
        titulo={cliente?.razao_social ?? "Novo pedido"}
        voltarPara="/inicio"
        acao={
          <button onClick={() => setEtapa("cliente")} className="text-sm font-bold text-primary">
            Trocar
          </button>
        }
      />

      <div className="mx-auto max-w-lg px-4 py-4">
        {!online && (
          <p className="mb-3 flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-sm font-bold text-ink-foreground">
            <WifiOff className="size-4" /> Modo offline — o pedido será enviado ao voltar a internet.
          </p>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={buscaRef}
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome, código ou código de barras..."
            className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 outline-none focus:border-primary"
          />
        </div>

        <button
          onClick={() => duplicarUltimo.mutate()}
          disabled={duplicarUltimo.isPending}
          className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-bold disabled:opacity-50"
        >
          <Copy className="size-4" /> DUPLICAR ÚLTIMO PEDIDO DESTE CLIENTE
        </button>

        {busca.trim() && (
          <div className="mt-2 max-h-72 space-y-2 overflow-y-auto rounded-2xl bg-secondary p-2">
            {produtosOffline.map((p) => (
              <button
                key={p.id}
                onClick={() => abrirProduto(p)}
                className="flex w-full items-center gap-2 rounded-xl bg-card p-3 text-left shadow-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold leading-tight">{p.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {brl(p.preco)} • estoque {Number(p.estoque_atual)}
                  </p>
                </div>
                <span className="rounded-full bg-primary p-2 text-primary-foreground">
                  <Plus className="size-5" />
                </span>
              </button>
            ))}
            {produtosOffline.length === 0 && <p className="p-4 text-center text-sm">Nada encontrado.</p>}
          </div>
        )}

        <h2 className="mt-5 text-sm font-bold text-muted-foreground">ITENS DO PEDIDO</h2>
        <div className="mt-2 space-y-2">
          {itens.map((i, idx) => (
            <div key={`${i.produto_id}-${i.embalagem}`} className="rounded-2xl bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-bold leading-tight">{i.produto_nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.embalagem}
                    {i.unidades_por_embalagem > 1 ? ` com ${i.unidades_por_embalagem} ${i.unidade}` : ""} •{" "}
                    {brl(i.valor_unitario)}
                  </p>
                </div>
                <button
                  onClick={() => setItens(itens.filter((_, k) => k !== idx))}
                  className="text-primary"
                  aria-label="Remover"
                >
                  <Trash2 className="size-5" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setItens(
                        itens
                          .map((x, k) => (k === idx ? { ...x, quantidade: x.quantidade - 1 } : x))
                          .filter((x) => x.quantidade > 0),
                      )
                    }
                    className="flex size-10 items-center justify-center rounded-full bg-secondary"
                  >
                    <Minus className="size-5" />
                  </button>
                  <span className="w-8 text-center text-lg font-black">{i.quantidade}</span>
                  <button
                    onClick={() =>
                      setItens(itens.map((x, k) => (k === idx ? { ...x, quantidade: x.quantidade + 1 } : x)))
                    }
                    className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Plus className="size-5" />
                  </button>
                </div>
                <p className="text-lg font-black">{brl(i.quantidade * i.valor_unitario)}</p>
              </div>
            </div>
          ))}
          {itens.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Busque um produto para adicionar.</p>
          )}
        </div>

        {itens.length > 0 && (
          <div className="mt-4 space-y-3 rounded-2xl bg-card p-4 shadow-card">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Desconto (R$)</label>
              <input
                inputMode="decimal"
                value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-border px-4 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Condição de pagamento</label>
              <input
                value={condicao}
                onChange={(e) => setCondicao(e.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-border px-4 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Observações</label>
              <textarea
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border px-4 py-2 outline-none focus:border-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Rodapé fixo */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-card px-4 py-3 shadow-card safe-bottom">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{totalItens} item(ns)</p>
            <p className="text-xl font-black">{brl(total)}</p>
          </div>
          <button
            onClick={() => setEtapa("conferencia")}
            disabled={itens.length === 0}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-base font-extrabold text-primary-foreground shadow-float disabled:opacity-50"
          >
            <ClipboardCheck className="size-5" /> CONFERIR
          </button>
        </div>
      </div>

      {/* Modal rápido */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={() => setModal(null)}>
          <div
            className="w-full rounded-t-3xl bg-card p-5 pb-[calc(env(safe-area-inset-bottom,0px)+5rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto max-w-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black leading-tight">{modal.nome}</p>
                  <p className="text-2xl font-black text-primary">{brl(valorDaEmbalagem(modal, embalagem))}</p>
                  <p className="text-xs text-muted-foreground">
                    por {embalagem}
                    {unidadesDaEmbalagem(modal, embalagem) > 1
                      ? ` (${unidadesDaEmbalagem(modal, embalagem)} ${modal.unidade})`
                      : ""}
                  </p>
                  {Number(modal.estoque_atual) <= Number(modal.estoque_minimo) && (
                    <p className="mt-1 text-xs font-bold text-primary">
                      <AlertTriangle className="mr-1 inline size-3" />
                      Estoque baixo: {Number(modal.estoque_atual)}
                    </p>
                  )}
                </div>
                <button onClick={() => setModal(null)} aria-label="Fechar">
                  <X className="size-6" />
                </button>
              </div>

              <div className="mt-4 flex gap-2">
                {EMBALAGENS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setEmbalagem(t)}
                    className={`flex-1 rounded-xl py-2 text-sm font-bold ${
                      embalagem === t ? "bg-primary text-primary-foreground" : "bg-secondary"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-center gap-4">
                <button
                  onClick={() => setQtd(Math.max(1, qtd - 1))}
                  className="flex size-14 items-center justify-center rounded-full bg-secondary"
                >
                  <Minus className="size-7" />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={1}
                  value={qtd}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setQtd(Math.max(1, Number(e.target.value) || 1))}
                  className="w-24 rounded-xl border border-border bg-card py-2 text-center text-3xl font-black outline-none focus:border-primary"
                />
                <button
                  onClick={() => setQtd(qtd + 1)}
                  className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  <Plus className="size-7" />
                </button>
              </div>

              <p className="mt-4 text-center text-lg font-bold">
                Subtotal: <span className="text-primary">{brl(qtd * valorDaEmbalagem(modal, embalagem))}</span>
              </p>

              <button
                onClick={() => {
                  fecharTeclado();
                  adicionar();
                }}
                className="mt-4 h-14 w-full rounded-xl bg-primary text-lg font-extrabold text-primary-foreground shadow-float"
              >
                ADICIONAR PRODUTO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
