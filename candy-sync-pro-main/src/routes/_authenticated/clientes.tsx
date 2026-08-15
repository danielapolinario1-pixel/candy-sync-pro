import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Pencil, Trash2, MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { whatsappLink } from "@/lib/format";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes | SSD ATACADO" },
      { name: "description", content: "Cadastro compartilhado de clientes da SSD Atacado com busca instantânea." },
      { property: "og:title", content: "Clientes | SSD ATACADO" },
      { property: "og:description", content: "Cadastre, edite e pesquise clientes por nome ou cidade." },
    ],
  }),
  component: Clientes,
});

type Cliente = Tables<"clientes">;
const vazio = {
  razao_social: "",
  nome_fantasia: "",
  responsavel: "",
  documento: "",
  telefone: "",
  whatsapp: "",
  cidade: "",
  endereco: "",
  observacoes: "",
};

function Clientes() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<typeof vazio | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").order("razao_social");
      if (error) throw error;
      return data as Cliente[];
    },
  });

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return clientes;
    return clientes.filter((c) =>
      [c.razao_social, c.nome_fantasia, c.cidade, c.responsavel]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(t)),
    );
  }, [clientes, busca]);

  const salvar = useMutation({
    mutationFn: async (dados: typeof vazio) => {
      if (editId) {
        const { error } = await supabase.from("clientes").update(dados).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clientes").insert(dados);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Cliente salvo");
      setForm(null);
      setEditId(null);
      void qc.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente excluído");
      void qc.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AppHeader
        titulo="Clientes"
        voltarPara="/inicio"
        acao={
          <button
            onClick={() => {
              setEditId(null);
              setForm({ ...vazio });
            }}
            className="rounded-full bg-primary p-2 text-primary-foreground"
            aria-label="Novo cliente"
          >
            <Plus className="size-6" />
          </button>
        }
      />

      <div className="mx-auto max-w-lg px-4 py-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou cidade"
            className="h-13 w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 outline-none focus:border-primary"
          />
        </div>

        <p className="mt-3 text-xs font-semibold text-muted-foreground">{filtrados.length} cliente(s)</p>

        <div className="mt-2 space-y-2">
          {filtrados.map((c) => (
            <div key={c.id} className="rounded-2xl bg-card p-4 shadow-card">
              <p className="text-base font-bold leading-tight">{c.razao_social}</p>
              {c.nome_fantasia && <p className="text-sm text-muted-foreground">{c.nome_fantasia}</p>}
              <p className="mt-1 text-sm text-muted-foreground">
                {[c.cidade, c.telefone].filter(Boolean).join(" • ") || "Sem contato"}
              </p>
              <div className="mt-3 flex gap-2">
                {c.whatsapp && (
                  <a
                    href={whatsappLink(c.whatsapp, `Olá ${c.responsavel || c.razao_social}, aqui é da SSD ATACADO!`)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 rounded-lg bg-success/10 py-2 text-center text-sm font-bold text-success"
                  >
                    <MessageCircle className="mr-1 inline size-4" /> WhatsApp
                  </a>
                )}
                <button
                  onClick={() => {
                    setEditId(c.id);
                    setForm({
                      razao_social: c.razao_social,
                      nome_fantasia: c.nome_fantasia ?? "",
                      responsavel: c.responsavel ?? "",
                      documento: c.documento ?? "",
                      telefone: c.telefone ?? "",
                      whatsapp: c.whatsapp ?? "",
                      cidade: c.cidade ?? "",
                      endereco: c.endereco ?? "",
                      observacoes: c.observacoes ?? "",
                    });
                  }}
                  className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Excluir ${c.razao_social}?`)) excluir.mutate(c.id);
                  }}
                  className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-bold text-primary"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
          {filtrados.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
          )}
        </div>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <AppHeader
            titulo={editId ? "Editar cliente" : "Novo cliente"}
            acao={
              <button onClick={() => setForm(null)} aria-label="Fechar" className="p-2">
                <X className="size-6" />
              </button>
            }
          />
          <form
            className="mx-auto w-full max-w-lg flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-28"
            onSubmit={(e) => {
              e.preventDefault();
              salvar.mutate(form);
            }}
          >
            {[
              ["razao_social", "Razão Social / Nome *", true],
              ["nome_fantasia", "Nome Fantasia", false],
              ["responsavel", "Responsável", false],
              ["documento", "CNPJ / CPF", false],
              ["telefone", "Telefone", false],
              ["whatsapp", "WhatsApp", false],
              ["cidade", "Cidade", false],
              ["endereco", "Endereço", false],
            ].map(([campo, label, req]) => (
              <div key={campo as string}>
                <label className="text-xs font-semibold text-muted-foreground">{label as string}</label>
                <input
                  required={req as boolean}
                  value={form[campo as keyof typeof vazio]}
                  onChange={(e) => setForm({ ...form, [campo as string]: e.target.value })}
                  className="mt-1 h-13 w-full rounded-xl border border-border bg-card px-4 py-3 outline-none focus:border-primary"
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Observações</label>
              <textarea
                rows={3}
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 outline-none focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={salvar.isPending}
              className="h-14 w-full rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-float"
            >
              SALVAR
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
