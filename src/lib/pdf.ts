import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { brl, dataHora } from "./format";
import {
  EMPRESA_PADRAO,
  cidadeUf,
  contatoEmpresa,
  enderecoCompleto,
  logoDataUrl,
  type Empresa,
} from "./empresa";

export interface PdfItem {
  produto_codigo?: string | null;
  produto_nome: string;
  quantidade: number;
  unidade: string;
  embalagem?: string | null;
  valor_unitario: number;
  subtotal: number;
}

export interface PdfPedido {
  numero: number;
  created_at: string;
  vendedor_nome: string;
  subtotal: number;
  desconto: number;
  total: number;
  condicao_pagamento?: string | null;
  prazo_entrega?: string | null;
  observacoes?: string | null;
  cliente: {
    razao_social: string;
    nome_fantasia?: string | null;
    documento?: string | null;
    endereco?: string | null;
    cidade?: string | null;
    telefone?: string | null;
    observacoes?: string | null;
  };
  itens: PdfItem[];
}

const VERMELHO: [number, number, number] = [214, 40, 40];
const PRETO: [number, number, number] = [17, 17, 17];

export function gerarPedidoPdf(
  p: PdfPedido,
  empresa: Empresa = EMPRESA_PADRAO,
  logo?: string | null,
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const L = 14;
  const R = 196;

  // Faixa superior da identidade visual
  doc.setFillColor(...VERMELHO);
  doc.rect(0, 0, 210, 4, "F");

  // Logo
  let textoX = L;
  if (logo) {
    try {
      doc.addImage(logo, "PNG", L, 8, 42, 28, undefined, "FAST");
      textoX = L + 46;
    } catch {
      textoX = L;
    }
  }

  doc.setTextColor(...PRETO);
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text(empresa.razao_social || EMPRESA_PADRAO.razao_social, textoX, 14, { maxWidth: 100 });
  doc.setFont("helvetica", "normal").setFontSize(8.5);
  let hy = 19;
  const cabecalho = [
    [empresa.cnpj && `CNPJ: ${empresa.cnpj}`, empresa.inscricao_estadual && `IE: ${empresa.inscricao_estadual}`]
      .filter(Boolean)
      .join("   "),
    enderecoCompleto(empresa),
    cidadeUf(empresa),
    contatoEmpresa(empresa),
    empresa.site,
  ].filter(Boolean) as string[];
  cabecalho.forEach((linha) => {
    doc.text(linha, textoX, hy, { maxWidth: 100 });
    hy += 4.2;
  });

  // Bloco do pedido (à direita, sem quadro, borda ou fundo)
  const d = new Date(p.created_at);
  doc.setTextColor(...PRETO).setFont("helvetica", "bold").setFontSize(13);
  doc.text("PEDIDO DE VENDA", R, 14, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(8.5);
  let py = 19;
  [
    `Pedido Nº: ${p.numero}`,
    `Data: ${d.toLocaleDateString("pt-BR")}`,
    `Hora: ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    `Vendedor: ${p.vendedor_nome}`,
  ].forEach((linha) => {
    doc.text(linha, R, py, { align: "right" });
    py += 4.2;
  });

  // Dados do cliente
  let y = Math.max(44, hy + 4, py + 4);
  doc.setFillColor(240, 240, 240);
  doc.rect(L, y, R - L, 7, "F");
  doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text("DADOS DO CLIENTE", L + 2, y + 5);
  y += 12;
  doc.setFont("helvetica", "normal").setFontSize(9);
  const c = p.cliente;
  const linhas = [
    `Razão Social: ${c.razao_social}`,
    `Nome Fantasia: ${c.nome_fantasia || "-"}      CNPJ/CPF: ${c.documento || "-"}`,
    `Endereço: ${c.endereco || "-"}      Cidade: ${c.cidade || "-"}`,
    `Telefone: ${c.telefone || "-"}`,
  ];
  linhas.forEach((t) => {
    doc.text(t, L, y);
    y += 5;
  });

  // Tabela de produtos
  autoTable(doc, {
    startY: y + 3,
    head: [["Código", "Produto", "Qtd", "Unidade", "Vl. Unit.", "Subtotal"]],
    body: p.itens.map((i) => [
      i.produto_codigo || "-",
      i.produto_nome,
      String(Number(i.quantidade)),
      i.embalagem && i.embalagem !== "Unidade" ? `${i.embalagem}` : i.unidade,
      brl(i.valor_unitario),
      brl(i.subtotal),
    ]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2, textColor: PRETO, lineColor: [200, 200, 200] },
    headStyles: { fillColor: PRETO, textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 22 },
      2: { cellWidth: 14, halign: "right" },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 26, halign: "right" },
      5: { cellWidth: 28, halign: "right" },
    },
    margin: { left: L, right: 14 },
  });

  // Totalização
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ty = ((doc as any).lastAutoTable?.finalY ?? y) + 8;
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text("Subtotal:", 140, ty);
  doc.text(brl(p.subtotal), R, ty, { align: "right" });
  ty += 6;
  doc.text("Desconto:", 140, ty);
  doc.text(brl(p.desconto), R, ty, { align: "right" });
  ty += 4;
  doc.setFillColor(...VERMELHO);
  doc.rect(126, ty, 70, 11, "F");
  doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(12);
  doc.text("VALOR TOTAL", 129, ty + 7.5);
  doc.text(brl(p.total), 193, ty + 7.5, { align: "right" });
  doc.setTextColor(...PRETO);

  // Rodapé comercial
  let fy = ty + 22;
  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text("Observações:", L, fy);
  doc.setFont("helvetica", "normal");
  doc.text(p.observacoes || c.observacoes || "-", L + 24, fy, { maxWidth: 100 });
  fy += 6;
  doc.text(`Condição de Pagamento: ${p.condicao_pagamento || "A combinar"}`, L, fy);
  fy += 5;
  doc.text(`Prazo de Entrega: ${p.prazo_entrega || "A combinar"}`, L, fy);

  fy += 24;
  doc.setDrawColor(120, 120, 120).setLineWidth(0.3);
  doc.line(L, fy, 90, fy);
  doc.line(115, fy, R, fy);
  doc.setFontSize(8);
  doc.text("Assinatura do Vendedor", L, fy + 5);
  doc.text("Assinatura do Cliente", 115, fy + 5);

  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...VERMELHO);
  doc.text("* ESTE DOCUMENTO É UM PEDIDO DE VENDA E NÃO TEM VALOR DE NOTA FISCAL *", 105, 288, {
    align: "center",
  });

  return doc;
}

export async function gerarPedidoPdfComLogo(p: PdfPedido, empresa: Empresa = EMPRESA_PADRAO) {
  const logo = await logoDataUrl(empresa.logo_url);
  return gerarPedidoPdf(p, empresa, logo);
}

export function nomeArquivo(numero: number) {
  return `Pedido-${numero}-SSD-ATACADO.pdf`;
}

export async function baixarPdf(p: PdfPedido, empresa?: Empresa) {
  const doc = await gerarPedidoPdfComLogo(p, empresa);
  doc.save(nomeArquivo(p.numero));
}

export async function imprimirPdfA4(p: PdfPedido, empresa?: Empresa) {
  const doc = await gerarPedidoPdfComLogo(p, empresa);
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const janela = window.open(url, "_blank");
  if (!janela) {
    doc.save(nomeArquivo(p.numero));
    URL.revokeObjectURL(url);
    return false;
  }
  janela.addEventListener("load", () => janela.print(), { once: true });
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

export async function compartilharPdf(p: PdfPedido, empresa?: Empresa) {
  const doc = await gerarPedidoPdfComLogo(p, empresa);
  const blob = doc.output("blob");
  const file = new File([blob], nomeArquivo(p.numero), { type: "application/pdf" });
  const nav = navigator as Navigator & {
    canShare?: (d: { files: File[] }) => boolean;
    share?: (d: { files: File[]; title?: string; text?: string }) => Promise<void>;
  };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    await nav.share({ files: [file], title: `Pedido ${p.numero}`, text: "SSD ATACADO" });
    return true;
  }
  doc.save(nomeArquivo(p.numero));
  return false;
}
