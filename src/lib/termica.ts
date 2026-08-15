import { EMPRESA_PADRAO, cidadeUf, enderecoCompleto, logoDataUrl, type Empresa } from "./empresa";
import type { PdfPedido } from "./pdf";

/** Colunas típicas de bobina 80 mm (fonte padrão ESC/POS Font A = 12×24 → ~48 cols). */
export const LARGURA_80MM = 48;
const LARGURA = LARGURA_80MM;

const STORAGE_BT = "ssd:impressora-bt-goldensky";
const CHUNK = 160;
const CHUNK_DELAY_MS = 40;

/** Serviços GATT comuns em impressoras térmicas BLE/SPP (incl. família MTP / Goldensky MP80M-PT). */
const SERVICOS_IMPRESSORA = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "0000fff0-0000-1000-8000-00805f9b34fb",
  "0000ae30-0000-1000-8000-00805f9b34fb",
] as const;

const centro = (t: string) => {
  const s = t.slice(0, LARGURA);
  const pad = Math.max(0, Math.floor((LARGURA - s.length) / 2));
  return " ".repeat(pad) + s;
};

const linha = (c = "-") => c.repeat(LARGURA);

const doisLados = (esqTxt: string, dirTxt: string) => {
  const e = esqTxt.slice(0, LARGURA - dirTxt.length - 1);
  return e + " ".repeat(Math.max(1, LARGURA - e.length - dirTxt.length)) + dirTxt;
};

const money = (v: number) => Number(v).toFixed(2).replace(".", ",");

const esq = (t: string, n: number) => (t.length > n ? t.slice(0, n) : t.padEnd(n));
const dir = (t: string, n: number) => (t.length > n ? t.slice(-n) : t.padStart(n));

/** Quebra nomes longos respeitando palavras. */
function quebrar(texto: string, largura: number): string[] {
  const palavras = String(texto || "")
    .split(/\s+/)
    .filter(Boolean);
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

  out.push(linha("-"));
  out.push(totalLinha("Subtotal", money(p.subtotal)));
  out.push(totalLinha("Desconto", money(p.desconto)));
  out.push(totalLinha("TOTAL", money(p.total)));
  out.push(linha("-"));

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

const escHtml = (t: string) =>
  String(t ?? "").replace(/[<>&]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[ch] as string);

/** Impressão térmica via janela do navegador (bobina de 80 mm), com colunas de largura fixa. */
export async function imprimirTermicaHtml(p: PdfPedido, empresa: Empresa = EMPRESA_PADRAO) {
  const logo = await logoDataUrl(empresa.logo_url);
  const d = new Date(p.created_at);
  const fone = [empresa.telefone, empresa.whatsapp].filter(Boolean).join(" / ");
  const end = enderecoCompleto(empresa);
  const cid = cidadeUf(empresa);

  const info = (rot: string, val?: string | null) =>
    val ? `<tr><td class="rot">${escHtml(rot)}</td><td class="val">${escHtml(val)}</td></tr>` : "";

  const itens = p.itens
    .map((i) => {
      const nome = `${i.produto_nome}${i.embalagem && i.embalagem !== "Unidade" ? ` (${i.embalagem})` : ""}`;
      return `<tr>
<td class="prod">${escHtml(nome)}</td>
<td class="n qtd">${Number(i.quantidade)}</td>
<td class="n uni">${money(i.valor_unitario)}</td>
<td class="n tot">${money(i.subtotal)}</td>
</tr>`;
    })
    .join("");

  const totalRow = (rot: string, valor: number, forte = false) => `<tr class="${forte ? "forte" : ""}">
<td class="tr-rot"><span>${escHtml(rot)}</span></td>
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
.assin { border-top: 1px solid #000; margin-top: 14px; }
</style></head><body>
${logo ? `<img src="${logo}" alt="${escHtml(empresa.nome_fantasia || "SSD ATACADO")}">` : ""}
<div class="c b">${escHtml(empresa.razao_social || EMPRESA_PADRAO.razao_social)}</div>
${empresa.cnpj ? `<div class="c">CNPJ: ${escHtml(empresa.cnpj)}</div>` : ""}
${empresa.inscricao_estadual ? `<div class="c">IE: ${escHtml(empresa.inscricao_estadual)}</div>` : ""}
${fone ? `<div class="c">Fone: ${escHtml(fone)}</div>` : ""}
${end ? `<div class="c">${escHtml(end)}</div>` : ""}
${cid ? `<div class="c">${escHtml(cid)}</div>` : ""}
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
<div>${escHtml(p.observacoes || "-")}</div>
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

/* -------------------------------------------------------------------------- */
/* Web Bluetooth + ESC/POS — Goldensky MP80M-PT / MTP-3 e compatíveis         */
/* -------------------------------------------------------------------------- */

interface BtCharacteristic {
  uuid?: string;
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValue: (d: BufferSource) => Promise<void>;
  writeValueWithoutResponse?: (d: BufferSource) => Promise<void>;
}

interface BtService {
  uuid?: string;
  getCharacteristics: () => Promise<BtCharacteristic[]>;
}

interface BtServer {
  connected?: boolean;
  getPrimaryServices: () => Promise<BtService[]>;
}

interface BtDevice {
  id: string;
  name?: string;
  gatt?: {
    connected?: boolean;
    connect: () => Promise<BtServer>;
    disconnect?: () => void;
  };
  addEventListener?: (type: string, listener: () => void) => void;
}

interface BluetoothLike {
  requestDevice: (o: unknown) => Promise<BtDevice>;
  getDevices?: () => Promise<BtDevice[]>;
}

export type StatusImpressoraBt = {
  disponivel: boolean;
  nome: string | null;
  conectada: boolean;
  salva: boolean;
};

type ImpressoraSalva = { id: string; name: string };

let deviceAtual: BtDevice | null = null;
let canalAtual: BtCharacteristic | null = null;
let listenersStatus: Array<() => void> = [];

function lerSalva(): ImpressoraSalva | null {
  try {
    const raw = localStorage.getItem(STORAGE_BT);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ImpressoraSalva;
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

function gravarSalva(d: ImpressoraSalva) {
  localStorage.setItem(STORAGE_BT, JSON.stringify(d));
}

function limparSalva() {
  localStorage.removeItem(STORAGE_BT);
}

function notificarStatus() {
  listenersStatus.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

/** Inscreve-se em mudanças de status da impressora Bluetooth (conectar/desconectar). */
export function onStatusImpressoraBt(cb: () => void) {
  listenersStatus.push(cb);
  return () => {
    listenersStatus = listenersStatus.filter((f) => f !== cb);
  };
}

export function bluetoothDisponivel() {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

export function statusImpressoraBluetooth(): StatusImpressoraBt {
  const salva = lerSalva();
  const conectada = Boolean(deviceAtual?.gatt?.connected && canalAtual);
  return {
    disponivel: bluetoothDisponivel(),
    nome: deviceAtual?.name || salva?.name || null,
    conectada,
    salva: Boolean(salva),
  };
}

/** Lista impressoras Bluetooth já autorizadas pelo navegador. */
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

/** Mapa UTF-8 → CP850 (tabela 2 ESC/POS) para acentuação pt-BR. */
const CP850: Record<string, number> = {
     'Ç': 0x80, 'ü': 0x81, 'é': 0x82, 'â': 0x83, 'ä': 0x84, 'à': 0x85, 'å': 0x86, 'ç': 0x87,
    'ê': 0x88, 'ë': 0x89, 'è': 0x8a, 'ï': 0x8b, 'î': 0x8c, 'ì': 0x8d, 'Ä': 0x8e, 'Å': 0x8f,
    'É': 0x90, 'æ': 0x91, 'Æ': 0x92, 'ô': 0x93, 'ö': 0x94, 'ò': 0x95, 'û': 0x96, 'ù': 0x97,
    'ÿ': 0x98, 'Ö': 0x99, 'Ü': 0x9a, 'ø': 0x9b, '£': 0x9c, 'Ø': 0x9d, '×': 0x9e, 'ƒ': 0x9f,
    'á': 0xa0, 'í': 0xa1, 'ó': 0xa2, 'ú': 0xa3, 'ñ': 0xa4, 'Ñ': 0xa5, 'ª': 0xa6, 'º': 0xa7,
    '¿': 0xa8, '®': 0xa9, '¬': 0xaa, '½': 0xab, '¼': 0xac, '¡': 0xad, '«': 0xae, '»': 0xaf,
  };

function encodeCp850(texto: string): Uint8Array {
  const out: number[] = [];
  for (const ch of texto) {
    const code = ch.charCodeAt(0);
    if (code <= 0x7f) out.push(code);
    else if (CP850[ch] != null) out.push(CP850[ch]);
    else out.push(0x3f); // ?
  }
  return new Uint8Array(out);
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

const u8 = (...nums: number[]) => new Uint8Array(nums);

/**
 * Monta o buffer ESC/POS completo para Goldensky MP80M-PT (80 mm / ESC/POS).
 * Inclui init, code page CP850, alinhamento, negrito no total e corte parcial.
 */
export function montarEscPos(p: PdfPedido, empresa: Empresa = EMPRESA_PADRAO): Uint8Array {
  const ESC = 0x1b;
  const GS = 0x1d;
  const fantasia = (empresa.nome_fantasia || empresa.razao_social || "SSD ATACADO").toUpperCase();
  const corpo = textoTermico(p, empresa);

  return concatBytes(
    u8(ESC, 0x40), // ESC @ — inicializa
    u8(ESC, 0x74, 0x02), // ESC t 2 — code page CP850 (Western Europe / PT)
    u8(ESC, 0x61, 0x01), // centraliza
    u8(ESC, 0x45, 0x01), // negrito ON
    u8(GS, 0x21, 0x11), // largura×altura dupla (cabeçalho)
    encodeCp850(`${fantasia}\n`),
    u8(GS, 0x21, 0x00), // tamanho normal
    u8(ESC, 0x45, 0x00), // negrito OFF
    u8(ESC, 0x61, 0x00), // alinha à esquerda
    encodeCp850(`${corpo}\n\n`),
    u8(ESC, 0x64, 0x04), // avança 4 linhas
    u8(GS, 0x56, 0x01), // GS V 1 — corte parcial (comum em portáteis 80 mm)
  );
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function escreverCanal(canal: BtCharacteristic, dados: Uint8Array) {
  for (let i = 0; i < dados.length; i += CHUNK) {
    const pedaco = dados.slice(i, i + CHUNK);
    if (canal.properties.writeWithoutResponse && canal.writeValueWithoutResponse) {
      await canal.writeValueWithoutResponse(pedaco);
    } else {
      await canal.writeValue(pedaco);
    }
    if (i + CHUNK < dados.length) await sleep(CHUNK_DELAY_MS);
  }
}

async function acharCanalEscrita(server: BtServer): Promise<BtCharacteristic> {
  const servicos = await server.getPrimaryServices();
  let candidato: BtCharacteristic | undefined;
  for (const s of servicos) {
    const chars = await s.getCharacteristics();
    for (const c of chars) {
      if (c.properties.writeWithoutResponse) return c;
      if (c.properties.write && !candidato) candidato = c;
    }
  }
  if (!candidato) throw new Error("Impressora sem canal ESC/POS de escrita (GATT)");
  return candidato;
}

function anexarListenerDesconexao(device: BtDevice) {
  device.addEventListener?.("gattserverdisconnected", () => {
    if (deviceAtual?.id === device.id) {
      canalAtual = null;
      notificarStatus();
    }
  });
}

async function conectarGatt(device: BtDevice): Promise<BtCharacteristic> {
  const server = await device.gatt?.connect();
  if (!server) throw new Error("Não foi possível conectar via GATT à impressora");
  const canal = await acharCanalEscrita(server);
  deviceAtual = device;
  canalAtual = canal;
  anexarListenerDesconexao(device);
  gravarSalva({ id: device.id, name: device.name || "Goldensky MP80M-PT" });
  notificarStatus();
  return canal;
}

async function solicitarDispositivo(): Promise<BtDevice> {
  const bt = (navigator as unknown as { bluetooth?: BluetoothLike }).bluetooth;
  if (!bt) throw new Error("Web Bluetooth não suportado neste navegador/dispositivo");

  // Preferência por nomes típicos da Goldensky / MTP; se nenhum bater no filtro, abre lista completa.
  try {
    return await bt.requestDevice({
      filters: [
        { namePrefix: "MTP" },
        { namePrefix: "MP80" },
        { namePrefix: "GS" },
        { namePrefix: "Golden" },
        { namePrefix: "Printer" },
        { namePrefix: "POS" },
        { namePrefix: "BlueTooth" },
        { namePrefix: "BT Printer" },
        { namePrefix: "Thermal" },
      ],
      optionalServices: [...SERVICOS_IMPRESSORA],
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    const msg = err instanceof Error ? err.message : String(err);
    if (/NotFoundError/i.test(name) || /no.*device|nenhum/i.test(msg)) {
      return bt.requestDevice({
        acceptAllDevices: true,
        optionalServices: [...SERVICOS_IMPRESSORA],
      });
    }
    throw err;
  }
}

async function reconectarSalva(): Promise<BtCharacteristic | null> {
  const salva = lerSalva();
  const bt = (navigator as unknown as { bluetooth?: BluetoothLike }).bluetooth;
  if (!salva || !bt?.getDevices) return null;
  try {
    const lista = await bt.getDevices();
    const device = lista.find((d) => d.id === salva.id);
    if (!device) return null;
    return await conectarGatt(device);
  } catch {
    return null;
  }
}

/**
 * Pareia e conecta a Mini Impressora Térmica Goldensky MP80M-PT (ou compatível ESC/POS).
 * O seletor do navegador aparece só nesta etapa; depois a sessão fica pronta para imprimir.
 */
export async function conectarImpressoraBluetooth(): Promise<string> {
  if (!bluetoothDisponivel()) {
    throw new Error("Bluetooth não suportado. Use Chrome/Edge em HTTPS (ou localhost).");
  }

  if (deviceAtual?.gatt?.connected && canalAtual) {
    return deviceAtual.name || lerSalva()?.name || "Impressora Bluetooth";
  }

  const reconectado = await reconectarSalva();
  if (reconectado) {
    return deviceAtual?.name || lerSalva()?.name || "Impressora Bluetooth";
  }

  const device = await solicitarDispositivo();
  await conectarGatt(device);
  return device.name || "Goldensky MP80M-PT";
}

/** Desconecta GATT e esquece a impressora salva neste aparelho/navegador. */
export async function desconectarImpressoraBluetooth() {
  try {
    deviceAtual?.gatt?.disconnect?.();
  } catch {
    /* ignore */
  }
  deviceAtual = null;
  canalAtual = null;
  limparSalva();
  notificarStatus();
}

/**
 * Envia o cupom ESC/POS 80 mm direto para a impressora Bluetooth.
 * Reutiliza a conexão pareada; só abre o seletor se ainda não houver impressora conectada/salva.
 */
export async function imprimirBluetooth(p: PdfPedido, empresa: Empresa = EMPRESA_PADRAO) {
  if (!bluetoothDisponivel()) {
    throw new Error("Bluetooth não suportado neste dispositivo");
  }

  let canal = canalAtual;
  if (!canal || !deviceAtual?.gatt?.connected) {
    canal = (await reconectarSalva()) || null;
  }
  if (!canal) {
    await conectarImpressoraBluetooth();
    canal = canalAtual;
  }
  if (!canal) throw new Error("Impressora sem canal de impressão compatível");

  const bytes = montarEscPos(p, empresa);
  await escreverCanal(canal, bytes);
  return deviceAtual?.name || lerSalva()?.name || "Impressora Bluetooth";
}
