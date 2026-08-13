import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Pencil, Trash2, Star, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { brl, CATEGORIAS, EMBALAGENS, precoUnitario } from "@/lib/format";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos | SSD ATACADO" },
      { name: "description", content: "Catálogo central de doces, chocolates, salgadinhos e bebidas com busca instantânea." },
      { property: "og:title", content: "Produtos | SSD ATACADO" },
      { property: "og:description", content: "Catálogo e estoque central compartilhado entre os vendedores." },
    ],
  }),
  component: Produtos,
});

type Produto = Tables<"produtos">;

const vazio = {
  codigo: "",
  nome: "",
  categoria: "Outros",
  marca: "",
  preco: "0",
  preco_custo: "0",
  codigo_barras: "",
  estoque_atual: "0",
  estoque_minimo: "0",
  unidade: "UN",
  favorito: false,
  tipo_embalagem: "Unidade",
  unidades_embalagem: "1",
  preco_embalagem: "0",
};

function Produtos() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string>("Todas");
  const [form, setForm] = useState<typeof vazio | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos", busca, categoria],
    queryFn: async () => {
      let query = supabase.from("produtos").select("*");
      const t = busca.trim();
      if (t) query = query.or(`nome.ilike.%${t}%,codigo.ilike.%${t}%,codigo_barras.ilike.%${t}%,marca.ilike.%${t}%`);
      if (categoria !== "Todas") query = query.eq("categoria", categoria);
      const { data, error } = await query.order("favorito", { ascending: false }).order("nome").limit(300);
      if (error) throw error;
      return data as Produto[];
    },
  });

  const lista = useMemo(() => produtos, [produtos]);

  const salvar = useMutation({
    mutationFn: async (d: typeof vazio) => {
      const unidadesEmb = Number(d.unidades_embalagem.replace(",", ".")) || 1;
      const precoEmb = Number(d.preco_embalagem.replace(",", ".")) || 0;
      const unitarioCalculado = precoUnitario(precoEmb, unidadesEmb);
      const payload = {
        codigo: d.codigo || null,
        nome: d.nome,
        categoria: d.categoria,
        marca: d.marca || null,
        preco: precoEmb > 0 ? unitarioCalculado : Number(d.preco.replace(",", ".")) || 0,
        preco_custo: Number(d.preco_custo.replace(",", ".")) || 0,
        codigo_barras: d.codigo_barras || null,
        estoque_atual: Number(d.estoque_atual.replace(",", ".")) || 0,
        estoque_minimo: Number(d.estoque_minimo.replace(",", ".")) || 0,
        unidade: d.unidade || "UN",
        favorito: d.favorito,
        tipo_embalagem: d.tipo_embalagem || "Unidade",
        unidades_embalagem: unidadesEmb,
        preco_embalagem: precoEmb,
      };

      const persistir = async (dados: typeof payload | Omit<typeof payload, "preco_custo">) => {
        if (editId) {
          const { error } = await supabase.from("produtos").update(dados).eq("id", editId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("produtos").insert(dados);
          if (error) throw error;
        }
      };

      try {
        await persistir(payload);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/preco_custo/i.test(msg)) {
          const { preco_custo: _ignorado, ...semCusto } = payload;
          await persistir(semCusto);
        } else {
          throw err;
        }
      }
    },
    onSuccess: () => {
      toast.success("Produto salvo");
      setForm(null);
      setEditId(null);
      void qc.invalidateQueries({ queryKey: ["produtos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const favoritar = useMutation({
    mutationFn: async (p: Produto) => {
      const { error } = await supabase.from("produtos").update({ favorito: !p.favorito }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["produtos"] }),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto excluído");
      void qc.invalidateQueries({ queryKey: ["produtos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AppHeader
        titulo="Produtos"
        voltarPara="/inicio"
        acao={
          <button
            onClick={() => {
              setEditId(null);
              setForm({ ...vazio });
            }}
            className="rounded-full bg-primary p-2 text-primary-foreground"
            aria-label="Novo produto"
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
            placeholder="Buscar por nome ou código"
            className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 outline-none focus:border-primary"
          />
        </div>

        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {["Todas", ...CATEGORIAS].map((c) => (
            <button
              key={c}
              onClick={() => setCategoria(c)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${
                categoria === c ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          {lista.map((p) => {
            const critico = Number(p.estoque_atual) <= Number(p.estoque_minimo);
            return (
              <div key={p.id} className="rounded-2xl bg-card p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <button onClick={() => favoritar.mutate(p)} className="pt-1" aria-label="Favoritar">
                    <Star className={`size-6 ${p.favorito ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold leading-tight">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {[p.codigo, p.categoria, p.marca].filter(Boolean).join(" • ")}
                    </p>
                    <p className="mt-1 text-lg font-black text-primary">{brl(p.preco)}</p>
                    <p className={`text-sm font-semibold ${critico ? "text-primary" : "text-muted-foreground"}`}>
                      {critico && <AlertTriangle className="mr-1 inline size-4" />}
                      Estoque: {Number(p.estoque_atual)} {p.unidade} (mín. {Number(p.estoque_minimo)})
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      setEditId(p.id);
                      setForm({
                        codigo: p.codigo ?? "",
                        nome: p.nome,
                        categoria: p.categoria,
                        marca: p.marca ?? "",
                        preco: String(p.preco),
                        preco_custo: String(p.preco_custo ?? 0),
                        codigo_barras: p.codigo_barras ?? "",
                        estoque_atual: String(p.estoque_atual),
                        estoque_minimo: String(p.estoque_minimo),
                        unidade: p.unidade,
                        favorito: p.favorito,
                        tipo_embalagem: p.tipo_embalagem ?? "Unidade",
                        unidades_embalagem: String(p.unidades_embalagem ?? 1),
                        preco_embalagem: String(p.preco_embalagem ?? 0),
                      });
                    }}
                    className="flex-1 rounded-lg bg-secondary py-2 text-sm font-bold"
                  >
                    <Pencil className="mr-1 inline size-4" /> Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir ${p.nome}?`)) excluir.mutate(p.id);
                    }}
                    className="rounded-lg bg-primary/10 px-4 py-2 text-primary"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {lista.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</p>
          )}
        </div>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <AppHeader
            titulo={editId ? "Editar produto" : "Novo produto"}
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
            <Campo label="Nome *" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} required />
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Categoria</label>
              <select
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="mt-1 h-13 w-full rounded-xl border border-border bg-card px-4 py-3 outline-none focus:border-primary"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <Campo label="Marca" value={form.marca} onChange={(v) => setForm({ ...form, marca: v })} />
            <Campo label="Código" value={form.codigo} onChange={(v) => setForm({ ...form, codigo: v })} />
            <Campo
              label="Código de barras"
              value={form.codigo_barras}
              onChange={(v) => setForm({ ...form, codigo_barras: v })}
            />
            <div className="rounded-2xl bg-secondary p-3">
              <p className="text-xs font-bold text-muted-foreground">EMBALAGEM E PREÇO AUTOMÁTICO</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Tipo de embalagem</label>
                  <select
                    value={form.tipo_embalagem}
                    onChange={(e) => setForm({ ...form, tipo_embalagem: e.target.value })}
                    className="mt-1 h-13 w-full rounded-xl border border-border bg-card px-4 py-3 outline-none focus:border-primary"
                  >
                    {EMBALAGENS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <Campo
                  label="Unidades por embalagem"
                  value={form.unidades_embalagem}
                  onChange={(v) => setForm({ ...form, unidades_embalagem: v })}
                  inputMode="decimal"
                />
                <Campo
                  label="Preço da embalagem (R$)"
                  value={form.preco_embalagem}
                  onChange={(v) => setForm({ ...form, preco_embalagem: v })}
                  inputMode="decimal"
                />
              </div>
              <p className="mt-2 rounded-xl bg-card px-3 py-2 text-sm font-bold">
                Preço unitário calculado:{" "}
                <span className="text-primary">
                  {brl(
                    precoUnitario(
                      Number(form.preco_embalagem.replace(",", ".")) || 0,
                      Number(form.unidades_embalagem.replace(",", ".")) || 1,
                    ),
                  )}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Campo
                label="Preço unitário de venda"
                value={form.preco}
                onChange={(v) => setForm({ ...form, preco: v })}
                inputMode="decimal"
              />
              <Campo
                label="Preço de custo (R$)"
                value={form.preco_custo}
                onChange={(v) => setForm({ ...form, preco_custo: v })}
                inputMode="decimal"
              />
              <Campo label="Unidade" value={form.unidade} onChange={(v) => setForm({ ...form, unidade: v })} />
              <Campo
                label="Estoque atual"
                value={form.estoque_atual}
                onChange={(v) => setForm({ ...form, estoque_atual: v })}
                inputMode="decimal"
              />
              <Campo
                label="Estoque mínimo"
                value={form.estoque_minimo}
                onChange={(v) => setForm({ ...form, estoque_minimo: v })}
                inputMode="decimal"
              />
            </div>
            <label className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-card">
              <input
                type="checkbox"
                checked={form.favorito}
                onChange={(e) => setForm({ ...form, favorito: e.target.checked })}
                className="size-5 accent-current text-primary"
              />
              <span className="font-semibold">Produto favorito</span>
            </label>
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

function Campo({
  label,
  value,
  onChange,
  required,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  inputMode?: "decimal" | "text";
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <input
        required={required}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-13 w-full rounded-xl border border-border bg-card px-4 py-3 outline-none focus:border-primary"
      />
    </div>
  );
}
