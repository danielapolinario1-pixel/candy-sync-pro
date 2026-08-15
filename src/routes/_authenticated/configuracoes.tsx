import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Upload, LogOut, User, Database, Building2, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Logo } from "@/components/Logo";
import { useEmpresa } from "@/hooks/useEmpresa";
import { useSessao } from "@/hooks/useSessao";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações | SSD ATACADO" },
      { name: "description", content: "Conta do vendedor, backup em JSON, restauração de dados e saída do aplicativo." },
      { property: "og:title", content: "Configurações | SSD ATACADO" },
      { property: "og:description", content: "Backup JSON, restauração e conta do vendedor." },
    ],
  }),
  component: Configuracoes,
});

const formVazio = { nome: "", email: "", senha: "", confirmar: "" };

function Configuracoes() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { sessao } = useSessao();
  const { empresa } = useEmpresa();
  const [ocupado, setOcupado] = useState(false);

  const [formUsuario, setFormUsuario] = useState(formVazio);
  const [cadastrando, setCadastrando] = useState(false);

  async function exportar() {
    setOcupado(true);
    try {
      const [clientes, produtos, pedidos, itens, movs] = await Promise.all([
        supabase.from("clientes").select("*"),
        supabase.from("produtos").select("*"),
        supabase.from("pedidos").select("*"),
        supabase.from("pedido_itens").select("*"),
        supabase.from("movimentacoes_estoque").select("*"),
      ]);
      const backup = {
        app: "SSD ATACADO",
        versao: 1,
        gerado_em: new Date().toISOString(),
        clientes: clientes.data ?? [],
        produtos: produtos.data ?? [],
        pedidos: pedidos.data ?? [],
        pedido_itens: itens.data ?? [],
        movimentacoes_estoque: movs.data ?? [],
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ssd-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup exportado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  async function importar(file: File) {
    setOcupado(true);
    try {
      const texto = await file.text();
      const dados = JSON.parse(texto) as Record<string, unknown[]>;
      if (Array.isArray(dados["clientes"]) && dados["clientes"].length) {
        const { error } = await supabase.from("clientes").upsert(dados["clientes"] as never);
        if (error) throw error;
      }
      if (Array.isArray(dados["produtos"]) && dados["produtos"].length) {
        const { error } = await supabase.from("produtos").upsert(dados["produtos"] as never);
        if (error) throw error;
      }
      void qc.invalidateQueries();
      toast.success("Backup restaurado (clientes e produtos)");
    } catch (e) {
      toast.error(`Falha ao restaurar: ${(e as Error).message}`);
    } finally {
      setOcupado(false);
    }
  }

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  async function cadastrarUsuario(e: React.FormEvent) {
    e.preventDefault();

    const nome = formUsuario.nome.trim();
    const email = formUsuario.email.trim().toLowerCase();
    const senha = formUsuario.senha;

    if (!nome) return toast.error("Informe o nome completo.");
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return toast.error("Informe um e-mail válido.");
    if (senha.length < 6) return toast.error("A senha deve ter no mínimo 6 caracteres.");
    if (senha !== formUsuario.confirmar) return toast.error("As senhas não conferem.");

    setCadastrando(true);
    try {
      const { data: sessaoData } = await supabase.auth.getSession();
      const token = sessaoData.session?.access_token;
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");

      const apiUrl = `${import.meta.env["VITE_SUPABASE_URL"]}/functions/v1/criar-usuario`;
      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "",
        },
        body: JSON.stringify({ nome, email, senha }),
      });

      const resultado = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg =
          (resultado as { error?: string }).error ||
          (resp.status === 401
            ? "Sessão expirada. Faça login novamente."
            : `Falha ao cadastrar (${resp.status}).`);
        throw new Error(msg);
      }

      toast.success(`Usuário "${nome}" cadastrado com sucesso!`);
      setFormUsuario(formVazio);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao cadastrar usuário.";
      toast.error(msg);
    } finally {
      setCadastrando(false);
    }
  }

  return (
    <div>
      <AppHeader titulo="Configurações" voltarPara="/inicio" />
      <div className="mx-auto max-w-lg space-y-3 px-4 py-4">
        <div className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card">
          <Logo className="h-14" />
          <div className="min-w-0">
            <p className="truncate text-sm font-black leading-tight">{empresa.razao_social}</p>
            <p className="text-xs text-muted-foreground">{empresa.cnpj || "CNPJ não informado"}</p>
          </div>
        </div>

        <Link
          to="/empresa"
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-card font-extrabold shadow-card"
        >
          <Building2 className="size-5" /> DADOS DA EMPRESA
        </Link>

        <div className="rounded-2xl bg-card p-4 shadow-card">
          <p className="text-xs font-bold text-primary">
            <User className="mr-1 inline size-3" /> VENDEDOR
          </p>
          <p className="text-lg font-black leading-tight">{sessao?.nome ?? "—"}</p>
          <p className="text-sm text-muted-foreground">{sessao?.email}</p>
        </div>

        <div className="rounded-2xl bg-card p-4 shadow-card">
          <p className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
            <UserPlus className="size-3" /> CADASTRAR NOVO USUÁRIO
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Crie contas para outros vendedores sem sair da sua sessão.
          </p>
          <form className="mt-3 space-y-3" onSubmit={cadastrarUsuario}>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nome completo *</label>
              <input
                required
                autoComplete="off"
                value={formUsuario.nome}
                onChange={(e) => setFormUsuario({ ...formUsuario, nome: e.target.value })}
                placeholder="Ex: Vendedor 2"
                className="mt-1 h-13 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">E-mail *</label>
              <input
                required
                type="email"
                inputMode="email"
                autoComplete="off"
                value={formUsuario.email}
                onChange={(e) => setFormUsuario({ ...formUsuario, email: e.target.value })}
                placeholder="vendedor@email.com"
                className="mt-1 h-13 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Senha *</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  value={formUsuario.senha}
                  onChange={(e) => setFormUsuario({ ...formUsuario, senha: e.target.value })}
                  placeholder="Mín. 6 caracteres"
                  className="mt-1 h-13 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Confirmar *</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  value={formUsuario.confirmar}
                  onChange={(e) => setFormUsuario({ ...formUsuario, confirmar: e.target.value })}
                  placeholder="Repita a senha"
                  className={`mt-1 h-13 w-full rounded-xl border bg-background px-4 py-3 outline-none focus:border-primary ${
                    formUsuario.confirmar && formUsuario.confirmar !== formUsuario.senha
                      ? "border-primary"
                      : "border-border"
                  }`}
                />
              </div>
            </div>
            {formUsuario.confirmar && formUsuario.confirmar !== formUsuario.senha && (
              <p className="text-xs font-semibold text-primary">As senhas não conferem.</p>
            )}
            <button
              type="submit"
              disabled={cadastrando}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-extrabold text-primary-foreground shadow-float disabled:opacity-50"
            >
              {cadastrando ? (
                <>
                  <Loader2 className="size-5 animate-spin" /> CADASTRANDO...
                </>
              ) : (
                <>
                  <UserPlus className="size-5" /> CADASTRAR USUÁRIO
                </>
              )}
            </button>
          </form>
        </div>

        <div className="rounded-2xl bg-card p-4 shadow-card">
          <p className="text-xs font-bold text-muted-foreground">
            <Database className="mr-1 inline size-3" /> DADOS
          </p>
          <button
            onClick={exportar}
            disabled={ocupado}
            className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-ink font-extrabold text-ink-foreground disabled:opacity-50"
          >
            <Download className="size-5" /> EXPORTAR BACKUP JSON
          </button>
          <label className="mt-3 flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary font-extrabold">
            <Upload className="size-5" /> RESTAURAR BACKUP
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importar(f);
                e.target.value = "";
              }}
            />
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            A restauração atualiza clientes e produtos pelo identificador, sem apagar pedidos existentes.
          </p>
        </div>

        <button
          onClick={sair}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary font-extrabold text-primary-foreground shadow-float"
        >
          <LogOut className="size-5" /> SAIR DA CONTA
        </button>
      </div>
    </div>
  );
}
