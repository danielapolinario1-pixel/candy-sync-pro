export const brl = (v: number | string | null | undefined) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const num = (v: number | string | null | undefined) => Number(v ?? 0);

export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export const CATEGORIAS = [
  "Chocolate",
  "Balas",
  "Pirulitos",
  "Trento",
  "Elma Chips",
  "Treps",
  "Salgadinhos",
  "Bebidas",
  "Outros",
] as const;

export const soDigitos = (s: string) => (s || "").replace(/\D/g, "");

export function whatsappLink(telefone: string, texto: string) {
  let d = soDigitos(telefone);
  if (d.length <= 11) d = "55" + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
}

export const EMBALAGENS = ["Unidade", "Pacote", "Caixa", "Fardo"] as const;
export type Embalagem = (typeof EMBALAGENS)[number];

/** Preço unitário calculado a partir do preço e da quantidade da embalagem. */
export function precoUnitario(precoEmbalagem: number, unidadesEmbalagem: number) {
  const un = Number(unidadesEmbalagem) || 1;
  return Math.round((Number(precoEmbalagem) / un) * 100) / 100;
}
