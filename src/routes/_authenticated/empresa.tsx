import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { useEmpresa } from "@/hooks/useEmpresa";
import { LOGO_SSD, type Empresa } from "@/lib/empresa";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/empresa")({
  head: () => ({
    meta: [
      { title: "Dados da Empresa | SSD ATACADO" },
      {
        name: "description",
        content: "Cadastro dos dados oficiais da distribuidora usados no pedido de venda, PDF A4 e impressão térmica.",
      },
      { property: "og:title", content: "Dados da Empresa | SSD ATACADO" },
      { property: "og:description", content: "Razão social, CNPJ, endereço e contatos aplicados a todos os pedidos." },
    ],
  }),
  component: DadosEmpresa,
});

const CAMPOS: { chave: keyof Empresa; label: string; largura?: "meia" }[] = [
  { chave: "razao_social", label: "Razão Social *" },
  { chave: "nome_fantasia", label: "Nome Fantasia" },
  { chave: "cnpj", label: "CNPJ", largura: "meia" },
  { chave: "inscricao_estadual", label: "Inscrição Estadual", largura: "meia" },
  { chave: "endereco", label: "Endereço" },
  { chave: "numero", label: "Número", largura: "meia" },
  { chave: "bairro", label: "Bairro", largura: "meia" },
  { chave: "cidade", label: "Cidade", largura: "meia" },
  { chave: "estado", label: "Estado (UF)", largura: "meia" },
  { chave: "cep", label: "CEP", largura: "meia" },
  { chave: "telefone", label: "Telefone", largura: "meia" },
  { chave: "whatsapp", label: "WhatsApp", largura: "meia" },
  { chave: "email", label: "E-mail", largura: "meia" },
  { chave: "site", label: "Site (opcional)" },
  { chave: "logo_url", label: "URL da logo (opcional — em branco usa a logo SSD)" },
];

function DadosEmpresa() {
  const { empresa } = useEmpresa();
  const qc = useQueryClient();
  const [form, setForm] = useState<Empresa>(empresa);

  useEffect(() => {
    setForm(empresa);
  }, [empresa]);

  const salvar = useMutation({
    mutationFn: async (dados: Empresa) => {
      const payload = { ...dados, logo_url: dados.logo_url || null };
      if (payload.id) {
        const { error } = await supabase.from("empresa").update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { id: _ignorado, ...novo } = payload;
        const { error } = await supabase.from("empresa").insert(novo);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["empresa"] });
      toast.success("Dados da empresa salvos. Novos pedidos já usam estas informações.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AppHeader titulo="Dados da Empresa" voltarPara="/configuracoes" />
      <form
        className="mx-auto max-w-lg space-y-3 px-4 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          salvar.mutate(form);
        }}
      >
        <div className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card">
          <img
            src={form.logo_url || LOGO_SSD}
            alt="Logo da empresa"
            className="h-16 w-28 rounded-lg bg-white object-contain p-1"
          />
          <div>
            <p className="text-xs font-bold text-primary">
              <Building2 className="mr-1 inline size-3" /> LOGOTIPO
            </p>
            <p className="text-sm text-muted-foreground">
              Usado no cabeçalho do PDF A4, na impressão térmica e nas telas do app.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {CAMPOS.map(({ chave, label, largura }) => (
            <div key={chave} className={largura === "meia" ? "" : "col-span-2"}>
              <label className="text-xs font-semibold text-muted-foreground">{label}</label>
              <input
                required={chave === "razao_social"}
                value={String(form[chave] ?? "")}
                onChange={(e) => setForm({ ...form, [chave]: e.target.value })}
                className="mt-1 h-13 w-full rounded-xl border border-border bg-card px-4 py-3 outline-none focus:border-primary"
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={salvar.isPending}
          className="h-14 w-full rounded-xl bg-primary text-lg font-extrabold text-primary-foreground shadow-float disabled:opacity-50"
        >
          {salvar.isPending ? "SALVANDO..." : "SALVAR DADOS"}
        </button>
      </form>
    </div>
  );
}
