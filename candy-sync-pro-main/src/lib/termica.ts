import { EMPRESA_PADRAO, cidadeUf, enderecoCompleto, logoDataUrl, type Empresa } from "./empresa";
import type { PdfPedido } from "./pdf";

const LARGURA = 48; // colunas típicas de uma bobina de 80 mm

const centro = (t: string) => {
  const s = t.slice(0, LARGURA);
  const pad = Math.max(0, Math.floor((LARGURA - s.length) / 2));
  return " ".repeat(pad) + s;
};

const linha = (c = "-") => c.repeat(LARGURA);

const doisLados = (esq: string, dir: string) => {
  const e = esq.slice(0, LARGURA - dir.length - 1);
  return e + " ".repeat(Math.max(1, LARGURA - e.length - dir.length)) + dir;
};

const money = (v: number) => Number(v).toFixed(2).replace(".", ",");

const esq = (t: string, n: number) => (t.length > n ? t.slice(0, n) : t.padEnd(n));
const dir = (t: string, n: number) => (t.length > n ? t.slice(-n) : t.padStart(n));

/** Quebra nomes longos respeitando palavras. */
function quebrar(texto: string, largura: number): string[] {
  const palavras = String(texto || "").split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";
  for (const w of palavras) {
    if (!atual.length) {
      atual = w.slice(0, largura);
    } else if (atual.length + 1 + w.length <= largura) {
      atual += ` ${w}`;
    } else {
      linhas.push(atual);
      atual = w.slice(0, largura);
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [""];
}

/** Linha pontilhada de totais: rótulo........R$ valor */
const totalLinha = (rotulo: string, valor: string) => {
  const v = `R$ ${valor}`;
  const pontos = Math.max(1, LARGURA - rotulo.length - v.length);
  return rotulo + ".".repeat(pontos) + v;
};

/** Texto puro ESC/POS-friendly do comprovante 80 mm. */
export function textoTermico(p: PdfPedido, empresa: Empresa = EMPRESA_PADRAO): string {
  const d = new Date(p.created_at);
  const out: string[] = [];

  // Cabeçalho da empresa
  quebrar(empresa.razao_social || EMPRESA_PADRAO.razao_social, LARGURA).forEach((l) =>
    out.push(centro(l)),
  );
  if (empresa.cnpj) out.push(centro(`CNPJ: ${empresa.cnpj}`));
  if (empresa.inscricao_estadual) out.push(centro(`IE: ${empresa.inscricao_estadual}`));
  const fone = [empresa.telefone, empresa.whatsapp].filter(Boolean).join(" / ");
  if (fone) out.push(centro(`Fone: ${fone}`));
  const end = enderecoCompleto(empresa);
  if (end) quebrar(end, LARGURA).forEach((l) => out.push(centro(l)));
  const cid = cidadeUf(empresa);
  if (cid) out.push(centro(cid));

  // Dados do pedido
  out.push(linha("-"));
  out.push(centro(`PEDIDO Nº ${String(p.numero).padStart(6, "0")}`));
  out.push(linha("-"));
  const info = (rot: string, val: string) => {
    const partes = quebrar(val, LARGURA - 12);
    partes.forEach((l, i) => out.push(`${i === 0 ? esq(`${rot}:`, 12) : " ".repeat(12)}${l}`));
  };
  info("Cliente", p.cliente.razao_social);
  info("Vendedor", p.vendedor_nome);
  out.push(
    doisLados(
      `${esq("Data:", 12)}${d.toLocaleDateString("pt-BR")}`,
      `Hora: ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    ),
  );
  if (p.condicao_pagamento) info("Pagamento", p.condicao_pagamento);

  // Itens em colunas
  out.push(linha("-"));
  out.push(`${esq("Produto", 21)}${dir("Qtd", 5)}${dir("Unit.", 10)}${dir("Total", 12)}`);
  out.push(linha("-"));
  p.itens.forEach((i) => {
    const nome = `${i.produto_nome}${i.embalagem && i.embalagem !== "Unidade" ? ` (${i.embalagem})` : ""}`;
    const partes = quebrar(nome, 21);
    partes.forEach((l, idx) => {
      if (idx === partes.length - 1) {
        out.push(
          `${esq(l, 21)}${dir(String(Number(i.quantidade)), 5)}${dir(money(i.valor_unitario), 10)}${dir(money(i.subtotal), 12)}`,
        );
      } else {
        out.push(l);
      }
    });
  });

  // Totais
  out.push(linha("-"));
  out.push(totalLinha("Subtotal", money(p.subtotal)));
  out.push(totalLinha("Desconto", money(p.desconto)));
  out.push(totalLinha("TOTAL", money(p.total)));
  out.push(linha("-"));

  // Observações e assinaturas
  out.push("Observacoes:");
  quebrar(p.observacoes || "-", LARGURA).forEach((l) => out.push(l));
  out.push("");
  out.push("Recebido por:");
  out.push("_".repeat(LARGURA));
  out.push(centro("Assinatura"));
  out.push(linha("-"));
  out.push(centro("Obrigado pela preferencia!"));
  out.push(centro("Este documento nao possui valor fiscal."));
  out.push("");
  return out.join("\n");
}

const esc = (t: string) =>
  String(t ?? "").replace(/[<>&]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[ch] as string);

/** Impressão térmica via janela do navegador (bobina de 80 mm), com colunas de largura fixa. */
export async function imprimirTermicaHtml(p: PdfPedido, empresa: Empresa = EMPRESA_PADRAO) {
  const logo = await logoDataUrl(empresa.logo_url);
  const d = new Date(p.created_at);
  const fone = [empresa.telefone, empresa.whatsapp].filter(Boolean).join(" / ");
  const end = enderecoCompleto(empresa);
  const cid = cidadeUf(empresa);

  const info = (rot: string, val?: string | null) =>
    val ? `<tr><td class="rot">${esc(rot)}</td><td class="val">${esc(val)}</td></tr>` : "";

  const itens = p.itens
    .map((i) => {
      const nome = `${i.produto_nome}${i.embalagem && i.embalagem !== "Unidade" ? ` (${i.embalagem})` : ""}`;
      return `<tr>
<td class="prod">${esc(nome)}</td>
<td class="n qtd">${Number(i.quantidade)}</td>
<td class="n uni">${money(i.valor_unitario)}</td>
<td class="n tot">${money(i.subtotal)}</td>
</tr>`;
    })
    .join("");

  const totalRow = (rot: string, valor: number, forte = false) => `<tr class="${forte ? "forte" : ""}">
<td class="tr-rot"><span>${esc(rot)}</span></td>
<td class="tr-val">R$ ${money(valor)}</td>
</tr>`;

  const janela = window.open("", "_blank", "width=380,height=700");
  if (!janela) return false;
  janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Pedido ${p.numero}</title>
<style>
@page { size: 80mm auto; margin: 3mm; }
* { box-sizing: border-box; }
body { width: 72mm; margin: 0 auto; font-family: "Courier New", monospace; font-size: 10px; line-height: 1.3; color: #000; }
img { display: block; margin: 0 auto 4px; width: 52mm; }
.c { text-align: center; }
.b { font-weight: 700; }
hr { border: 0; border-top: 1px dashed #000; margin: 3px 0; }
table { width: 100%; table-layout: fixed; border-collapse: collapse; }
td { vertical-align: top; padding: 0; word-break: break-word; }
.rot { width: 20mm; }
.val { width: 52mm; }
.n { text-align: right; white-space: nowrap; word-break: keep-all; }
.prod { width: 32mm; }
.qtd { width: 8mm; }
.uni { width: 14mm; }
.tot { width: 18mm; }
thead td { font-weight: 700; }
tbody tr td { padding-bottom: 1px; }
.tot-tab td { padding: 0; }
.tr-rot { overflow: hidden; white-space: nowrap; }
.tr-rot span { padding-right: 2px; }
.tr-rot::after { content: "................................................................"; letter-spacing: 0; }
.tr-val { width: 24mm; text-align: right; white-space: nowrap; word-break: keep-all; }
.forte td { font-weight: 700; font-size: 11px; }
.dots { display: inline-block; width: 100%; overflow: hidden; }
.assin { border-top: 1px solid #000; margin-top: 14px; }
</style></head><body>
${logo ? `<img src="${logo}" alt="${esc(empresa.nome_fantasia || "SSD ATACADO")}">` : ""}
<div class="c b">${esc(empresa.razao_social || EMPRESA_PADRAO.razao_social)}</div>
${empresa.cnpj ? `<div class="c">CNPJ: ${esc(empresa.cnpj)}</div>` : ""}
${empresa.inscricao_estadual ? `<div class="c">IE: ${esc(empresa.inscricao_estadual)}</div>` : ""}
${fone ? `<div class="c">Fone: ${esc(fone)}</div>` : ""}
${end ? `<div class="c">${esc(end)}</div>` : ""}
${cid ? `<div class="c">${esc(cid)}</div>` : ""}
<hr>
<div class="c b">PEDIDO Nº ${String(p.numero).padStart(6, "0")}</div>
<hr>
<table>
${info("Cliente", p.cliente.razao_social)}
${info("Vendedor", p.vendedor_nome)}
${info("Data", `${d.toLocaleDateString("pt-BR")}  ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`)}
${info("Pagamento", p.condicao_pagamento)}
</table>
<hr>
<table>
<thead><tr><td class="prod">Produto</td><td class="n qtd">Qtd</td><td class="n uni">Unit.</td><td class="n tot">Total</td></tr></thead>
<tbody>${itens}</tbody>
</table>
<hr>
<table class="tot-tab">
${totalRow("Subtotal", p.subtotal)}
${totalRow("Desconto", p.desconto)}
${totalRow("TOTAL", p.total, true)}
</table>
<hr>
<div>Observacoes:</div>
<div>${esc(p.observacoes || "-")}</div>
<div class="assin"></div>
<div class="c">Assinatura do recebedor</div>
<hr>
<div class="c">Obrigado pela preferencia!</div>
<div class="c">Este documento nao possui valor fiscal.</div>
<br>
<script>window.onload = function(){ window.print(); }<\/script>
</body></html>`);
  janela.document.close();
  return true;
}


interface BluetoothLike {
  requestDevice: (o: unknown) => Promise<{
    name?: string;
    gatt?: {
      connect: () => Promise<{
        getPrimaryServices: () => Promise<
          { getCharacteristics: () => Promise<{ properties: { write: boolean; writeWithoutResponse: boolean }; writeValue: (d: BufferSource) => Promise<void> }[]> }[]
        >;
      }>;
    };
  }>;
  getDevices?: () => Promise<{ name?: string }[]>;
}

export function bluetoothDisponivel() {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

/** Lista impressoras Bluetooth já pareadas/autorizadas, quando o dispositivo permitir. */
export async function impressorasConhecidas(): Promise<string[]> {
  const bt = (navigator as unknown as { bluetooth?: BluetoothLike }).bluetooth;
  if (!bt?.getDevices) return [];
  try {
    const devs = await bt.getDevices();
    return devs.map((d) => d.name || "Impressora Bluetooth");
  } catch {
    return [];
  }
}

/** Envia o cupom para a impressora térmica Bluetooth (ESC/POS). */
export async function imprimirBluetooth(p: PdfPedido, empresa: Empresa = EMPRESA_PADRAO) {
  const bt = (navigator as unknown as { bluetooth?: BluetoothLike }).bluetooth;
  if (!bt) throw new Error("Bluetooth não suportado neste dispositivo");

  const device = await bt.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      "000018f0-0000-1000-8000-00805f9b34fb",
      "0000ff00-0000-1000-8000-00805f9b34fb",
      "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
      "49535343-fe7d-4ae5-8fa9-9fafd205e455",
    ],
  });
  const server = await device.gatt?.connect();
  if (!server) throw new Error("Não foi possível conectar à impressora");

  const servicos = await server.getPrimaryServices();
  let alvo:
    | { writeValue: (d: BufferSource) => Promise<void> }
    | undefined;
  for (const s of servicos) {
    const chars = await s.getCharacteristics();
    const c = chars.find((x) => x.properties.write || x.properties.writeWithoutResponse);
    if (c) {
      alvo = c;
      break;
    }
  }
  if (!alvo) throw new Error("Impressora sem canal de impressão compatível");

  const encoder = new TextEncoder();
  const ESC = "\x1b";
  const conteudo = `${ESC}@${ESC}a\x01${(empresa.nome_fantasia || "SSD ATACADO").toUpperCase()}\n${ESC}a\x00${textoTermico(p, empresa)}\n\n\n`;
  const bytes = encoder.encode(conteudo);

  for (let i = 0; i < bytes.length; i += 180) {
    await alvo.writeValue(bytes.slice(i, i + 180));
  }
  return device.name || "Impressora Bluetooth";
}
