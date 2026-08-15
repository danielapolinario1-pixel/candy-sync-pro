import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Upload, LogOut, User, Database, Building2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
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

function Configuracoes() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { sessao } = useSessao();
  const { empresa } = useEmpresa();
  const [ocupado, setOcupado] = useState(false);

  // Estados para criação de novo usuário
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [criandoUsuario, setCriandoUsuario] = useState(false);

  async function criarUsuario(e: React.FormEvent) {
    e.preventDefault();
    if (!novoEmail || !novaSenha) {
      toast.error("Preencha o e-mail e a senha.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem!");
      return;
    }

    setCriandoUsuario(true);
    try {
      // Cria um cliente temporário sem persistir sessão para não deslogar o Admin
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
      });

      const { error } = await tempSupabase.auth.signUp({
        email: novoEmail,
        password: novaSenha,
      });

      if (error) throw error;

      toast.success("Usuário cadastrado com sucesso!");
      setNovoEmail("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (err) {
      toast.error(`Erro ao criar usuário: ${(err as Error).message}`);
    } finally {
      setCriandoUsuario(false);
    }
  }

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

        {/* NOVA SEÇÃO: CADASTRO DE USUÁRIOS */}
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <p className="text-xs font-bold text-primary mb-3">
            <UserPlus className="mr-1 inline size-3" /> CADASTRAR NOVO USUÁRIO
          </p>
          <form onSubmit={criarUsuario} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">E-mail</label>
              <input
                type="email"
                required
                placeholder="novo@usuario.com"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Senha</label>
              <input
                type="password"
                required
                placeholder="******"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Confirmar Senha</label>
              <input
                type="password"
                required
                placeholder="******"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={criandoUsuario}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-extrabold text-primary-foreground disabled:opacity-50"
            >
              <UserPlus className="size-4" /> {criandoUsuario ? "CRIANDO..." : "CRIAR USUÁRIO"}
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