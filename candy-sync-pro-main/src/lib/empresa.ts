import logoAsset from "@/assets/ssd-logo.png.asset.json";

const logoUrl = logoAsset.url;

export interface Empresa {
  id?: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  inscricao_estadual: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  whatsapp: string;
  email: string;
  site: string;
  logo_url: string | null;
}

export const EMPRESA_PADRAO: Empresa = {
  razao_social: "SSD ATACADO DE DOCES E BEBIDAS LTDA",
  nome_fantasia: "SSD ATACADO",
  cnpj: "",
  inscricao_estadual: "",
  endereco: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
  telefone: "",
  whatsapp: "",
  email: "",
  site: "",
  logo_url: null,
};

export const LOGO_SSD = logoUrl;

export function enderecoCompleto(e: Empresa) {
  const rua = [e.endereco, e.numero].filter(Boolean).join(", ");
  const linha = [rua, e.bairro].filter(Boolean).join(" - ");
  return linha;
}

export function cidadeUf(e: Empresa) {
  const c = [e.cidade, e.estado].filter(Boolean).join(" / ");
  return [c, e.cep].filter(Boolean).join("  CEP: ");
}

export function contatoEmpresa(e: Empresa) {
  return [e.telefone && `Tel: ${e.telefone}`, e.whatsapp && `WhatsApp: ${e.whatsapp}`, e.email]
    .filter(Boolean)
    .join("  |  ");
}

const CHAVE_LOGO = "ssd:logo-dataurl";

/** Converte a logo (bundle ou URL da empresa) em dataURL, com cache local para funcionar offline. */
export async function logoDataUrl(url?: string | null): Promise<string | null> {
  const alvo = url || LOGO_SSD;
  const chave = `${CHAVE_LOGO}:${alvo}`;
  try {
    const cache = localStorage.getItem(chave);
    if (cache) return cache;
  } catch {
    /* storage indisponível */
  }
  try {
    const resp = await fetch(alvo);
    const blob = await resp.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error("falha ao ler logo"));
      fr.readAsDataURL(blob);
    });
    try {
      localStorage.setItem(chave, dataUrl);
    } catch {
      /* cota cheia */
    }
    return dataUrl;
  } catch {
    return null;
  }
}
