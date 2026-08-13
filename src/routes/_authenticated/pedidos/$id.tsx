import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Share2, MessageCircle, Printer, Bluetooth, Eye, Unplug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { brl, dataHora, whatsappLink } from "@/lib/format";
import { baixarPdf, imprimirPdfA4, compartilharPdf, type PdfPedido } from "@/lib/pdf";
import {
  imprimirTermicaHtml,
  imprimirBluetooth,
  bluetoothDisponivel,
  conectarImpressoraBluetooth,
  desconectarImpressoraBluetooth,
  statusImpressoraBluetooth,
  onStatusImpressoraBt,
  type StatusImpressoraBt,
} from "@/lib/termica";
import { useEmpresa } from "@/hooks/useEmpresa";
import { pedidoOfflinePorId } from "@/lib/offline";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/pedidos/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe do pedido | SSD ATACADO" },
      { name: "description", content: "Detalhe do pedido com PDF A4, térmica 80mm e Bluetooth ESC/POS (Goldensky MP80M-PT)." },
      { property: "og:title", content: "Detalhe do pedido | SSD ATACADO" },
      { property: "og:description", content: "PDF A4, impressão térmica 80mm, Bluetooth ESC/POS e WhatsApp." },
    ],
  }),
  component: DetalhePedido,
});

interface Dados {
  pdf: PdfPedido;
  cliente_nome: string;
  telefone: string;
  offline: boolean;
}

function DetalhePedido() {
  const { id } = Route.useParams();
  const { empresa } = useEmpresa();
  const [bt, setBt] = useState<StatusImpressoraBt>(() => statusImpressoraBluetooth());

  useEffect(() => {
    const sync = () => setBt(statusImpressoraBluetooth());
    sync();
    return onStatusImpressoraBt(sync);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["pedidos", id],
    queryFn: async (): Promise<Dados> => {
      const local = pedidoOfflinePorId(id);
      if (local) {
        return {
          offline: true,
          cliente_nome: local.cliente_nome,
          telefone: "",
          pdf: {
            numero: local.numero,
            created_at: local.created_at,
            vendedor_nome: local.vendedor_nome,
            subtotal: local.subtotal,
            desconto: local.desconto,
            total: local.total,
            condicao_pagamento: local.condicao_pagamento,
            prazo_entrega: null,
            observacoes: local.observacoes,
            cliente: { razao_social: local.cliente_nome },
            itens: local.itens.map((i) => ({
              produto_codigo: i.produto_codigo,
              produto_nome: i.produto_nome,
              quantidade: i.quantidade,
              unidade: i.unidade,
              embalagem: i.embalagem,
              valor_unitario: i.valor_unitario,
              subtotal: i.subtotal,
            })),
          },
        };
      }

      const { data: pedido, error } = await supabase.from("pedidos").select("*").eq("id", id).single();
      if (error) throw error;
      const { data: itens, error: e2 } = await supabase.from("pedido_itens").select("*").eq("pedido_id", id);
      if (e2) throw e2;
      let cliente: Tables<"clientes"> | null = null;
      if (pedido.cliente_id) {
        const { data: c } = await supabase.from("clientes").select("*").eq("id", pedido.cliente_id).maybeSingle();
        cliente = c;
      }
      return {
        offline: false,
        cliente_nome: pedido.cliente_nome,
        telefone: cliente?.whatsapp || cliente?.telefone || "",
        pdf: {
          numero: Number(pedido.numero),
          created_at: pedido.created_at,
          vendedor_nome: pedido.vendedor_nome,
          subtotal: Number(pedido.subtotal),
          desconto: Number(pedido.desconto),
          total: Number(pedido.total),
          condicao_pagamento: pedido.condicao_pagamento,
          prazo_entrega: pedido.prazo_entrega,
          observacoes: pedido.observacoes,
          cliente: {
            razao_social: cliente?.razao_social ?? pedido.cliente_nome,
            nome_fantasia: cliente?.nome_fantasia ?? null,
            documento: cliente?.documento ?? null,
            endereco: cliente?.endereco ?? null,
            cidade: cliente?.cidade ?? null,
            telefone: cliente?.telefone ?? null,
            observacoes: cliente?.observacoes ?? null,
          },
          itens: itens.map((i) => ({
            produto_codigo: i.produto_codigo,
            produto_nome: i.produto_nome,
            quantidade: Number(i.quantidade),
            unidade: i.unidade,
            embalagem: i.embalagem,
            valor_unitario: Number(i.valor_unitario),
            subtotal: Number(i.subtotal),
          })),
        },
      };
    },
  });

  if (isLoading || !data) {
    return (
      <div>
        <AppHeader titulo="Pedido" voltarPara="/pedidos" />
        <p className="p-8 text-center text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const { pdf, telefone, offline } = data;

  const textoWhats = [
    `📦 ${empresa.nome_fantasia || "SSD ATACADO"}`,
    `Cliente: ${data.cliente_nome}`,
    `Pedido Nº: #${pdf.numero}`,
    "--------------------------------",
    ...pdf.itens.map(
      (i) => `${Number(i.quantidade)}x ${i.produto_nome} ........ R$ ${Number(i.subtotal).toFixed(2)}`,
    ),
    "--------------------------------",
    `TOTAL: R$ ${Number(pdf.total).toFixed(2)}`,
    "",
    "Obrigado pela preferência!",
  ].join("\n");

  const acoes = [
    {
      icone: Eye,
      texto: "VISUALIZAR / IMPRIMIR A4",
      classe: "bg-ink text-ink-foreground",
      acao: async () => {
        const ok = await imprimirPdfA4(pdf, empresa);
        if (!ok) toast.success("PDF baixado no dispositivo");
      },
    },
    {
      icone: Download,
      texto: "BAIXAR PDF A4",
      classe: "bg-card shadow-card",
      acao: async () => {
        await baixarPdf(pdf, empresa);
        toast.success("PDF gerado");
      },
    },
    {
      icone: Printer,
      texto: "IMPRESSÃO TÉRMICA 80MM",
      classe: "bg-card shadow-card",
      acao: async () => {
        const ok = await imprimirTermicaHtml(pdf, empresa);
        if (!ok) toast.error("Permita janelas pop-up para imprimir");
      },
    },
    {
      icone: Share2,
      texto: "COMPARTILHAR PDF",
      classe: "bg-card shadow-card",
      acao: async () => {
        const compartilhado = await compartilharPdf(pdf, empresa);
        if (!compartilhado) toast.success("PDF baixado no dispositivo");
      },
    },
  ];

  const conectarBt = async () => {
    if (!bluetoothDisponivel()) {
      toast.error("Bluetooth não suportado. Use Chrome/Edge em HTTPS.");
      return;
    }
    try {
      const nome = await conectarImpressoraBluetooth();
      setBt(statusImpressoraBluetooth());
      toast.success(`Conectada: ${nome}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao conectar";
      if (!/cancel|abort/i.test(msg)) toast.error(msg);
    }
  };

  const desconectarBt = async () => {
    await desconectarImpressoraBluetooth();
    setBt(statusImpressoraBluetooth());
    toast.success("Impressora desconectada");
  };

  const imprimirBt = async () => {
    if (!bluetoothDisponivel()) {
      toast.error("Bluetooth não suportado neste dispositivo");
      return;
    }
    try {
      const nome = await imprimirBluetooth(pdf, empresa);
      setBt(statusImpressoraBluetooth());
      toast.success(`Enviado para ${nome}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha na impressão Bluetooth";
      if (!/cancel|abort/i.test(msg)) toast.error(msg);
    }
  };

  return (
    <div>
      <AppHeader titulo={`Pedido #${pdf.numero}`} voltarPara="/pedidos" />
      <div className="mx-auto max-w-lg px-4 py-4">
        {offline && (
          <div className="mb-3 rounded-xl bg-warning/15 px-3 py-2 text-sm font-semibold text-warning-foreground">
            Pedido salvo no aparelho — será enviado automaticamente quando houver internet.
          </div>
        )}
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <p className="text-xs font-bold text-primary">CLIENTE</p>
          <p className="text-lg font-black leading-tight">{data.cliente_nome}</p>
          <p className="text-sm text-muted-foreground">
            {dataHora(pdf.created_at)} • Vendedor: {pdf.vendedor_nome}
          </p>
        </div>

        <div className="mt-3 rounded-2xl bg-card p-4 shadow-card">
          <p className="mb-2 text-xs font-bold text-muted-foreground">ITENS</p>
          {pdf.itens.map((i, idx) => (
            <div key={idx} className="flex justify-between border-b border-border py-2 last:border-0">
              <span className="flex-1 pr-2 text-sm">
                <b>
                  {Number(i.quantidade)}x {i.embalagem && i.embalagem !== "Unidade" ? `${i.embalagem} ` : ""}
                </b>
                {i.produto_nome}
              </span>
              <span className="text-sm font-bold">{brl(i.subtotal)}</span>
            </div>
          ))}
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{brl(pdf.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Desconto</span>
              <span>{brl(pdf.desconto)}</span>
            </div>
            <div className="mt-2 flex justify-between rounded-xl bg-primary px-3 py-2 text-primary-foreground">
              <span className="font-bold">TOTAL</span>
              <span className="text-lg font-black">{brl(pdf.total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <a
            href={telefone ? whatsappLink(telefone, textoWhats) : undefined}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              if (!telefone) {
                e.preventDefault();
                toast.error("Cliente sem telefone/WhatsApp cadastrado");
              }
            }}
            className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-success text-lg font-extrabold text-success-foreground"
          >
            <MessageCircle className="size-6" /> ENVIAR POR WHATSAPP
          </a>

          {acoes.map(({ icone: Icone, texto, classe, acao }) => (
            <button
              key={texto}
              onClick={() => void acao()}
              className={`flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-lg font-extrabold ${classe}`}
            >
              <Icone className="size-6" /> {texto}
            </button>
          ))}

          <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
            <p className="text-xs font-bold text-muted-foreground">GOLDENSKY MP80M-PT · ESC/POS 80MM</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {bt.conectada
                ? `Conectada: ${bt.nome || "Impressora Bluetooth"}`
                : bt.salva
                  ? `Pareada: ${bt.nome || "Impressora"} (reconectará ao imprimir)`
                  : bt.disponivel
                    ? "Conecte a impressora uma vez; depois imprima sem o diálogo do sistema."
                    : "Web Bluetooth indisponível neste navegador. Use Chrome/Edge em HTTPS."}
            </p>
            <div className="mt-3 space-y-2">
              {!bt.conectada ? (
                <button
                  type="button"
                  onClick={() => void conectarBt()}
                  disabled={!bt.disponivel}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink text-base font-extrabold text-ink-foreground disabled:opacity-50"
                >
                  <Bluetooth className="size-5" /> CONECTAR IMPRESSORA BLUETOOTH
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void desconectarBt()}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-card text-base font-extrabold shadow-card"
                >
                  <Unplug className="size-5" /> DESCONECTAR IMPRESSORA
                </button>
              )}
              <button
                type="button"
                onClick={() => void imprimirBt()}
                disabled={!bt.disponivel}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-extrabold text-primary-foreground disabled:opacity-50"
              >
                <Printer className="size-5" /> IMPRIMIR VIA BLUETOOTH (ESC/POS)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
