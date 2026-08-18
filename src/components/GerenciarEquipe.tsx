import { useEffect, useState } from "react";
import {
  ChevronDown,
  Copy,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  Pencil,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { mensagemDeErro, useAcoesEquipe, useEquipe, type MembroEquipe } from "@/hooks/useEquipe";

interface FormNovoUsuario {
  nome: string;
  email: string;
  senha: string;
  confirmar: string;
  cargo: "admin" | "vendedor";
}

const formVazio: FormNovoUsuario = { nome: "", email: "", senha: "", confirmar: "", cargo: "vendedor" };

const inputBase =
  "mt-1 h-13 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary";

export function GerenciarEquipe() {
  const { membros, promovidoAAdmin, carregando, erro } = useEquipe();
  const acoes = useAcoesEquipe();

  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormNovoUsuario>({ ...formVazio });
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    if (promovidoAAdmin) {
      toast.success("Você foi definido como administrador (nenhum admin existia ainda).");
    }
  }, [promovidoAAdmin]);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    if (form.senha !== form.confirmar) {
      toast.error("As senhas não conferem.");
      return;
    }
    try {
      const criado = await acoes.criar.mutateAsync({
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        senha: form.senha,
        cargo: form.cargo,
      });
      toast.success(`"${criado.nome}" cadastrado como ${rotuloCargo(criado.cargo)}.`);
      setForm({ ...formVazio });
      setMostrarForm(false);
    } catch (err) {
      toast.error(mensagemDeErro(err));
    }
  }

  async function trocarCargo(membro: MembroEquipe) {
    const novo = membro.cargo === "admin" ? "vendedor" : "admin";
    if (membro.souEu && novo === "vendedor") {
      const ok = window.confirm(
        "Você vai rebaixar a SI MESMO para vendedor e perderá o acesso a esta tela. Continuar?",
      );
      if (!ok) return;
    }
    try {
      await acoes.trocarCargo.mutateAsync({ userId: membro.id, cargo: novo });
      toast.success(`${membro.nome} agora é ${rotuloCargo(novo)}.`);
    } catch (err) {
      toast.error(mensagemDeErro(err));
    }
  }

  if (erro) {
    return (
      <section className="rounded-2xl bg-card p-4 shadow-card">
        <p className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
          <Users className="size-3" /> EQUIPE
        </p>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-secondary p-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-sm font-semibold leading-snug">{erro}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
          <Users className="size-3" /> EQUIPE
        </p>
        {!carregando && (
          <span className="text-xs font-bold text-muted-foreground">
            {membros.length} {membros.length === 1 ? "usuário" : "usuários"}
          </span>
        )}
      </div>

      {carregando ? (
        <div className="flex h-20 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Carregando equipe...
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {membros.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setAbertoId(abertoId === m.id ? null : m.id)}
                className="flex w-full items-center gap-3 p-3 text-left"
              >
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                    m.cargo === "admin"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  {iniciais(m.nome)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold leading-tight">
                    {m.nome}
                    {m.souEu && <span className="ml-1 text-xs font-bold text-primary">(você)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                    m.cargo === "admin"
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {rotuloCargo(m.cargo)}
                </span>
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                    abertoId === m.id ? "rotate-180" : ""
                  }`}
                />
              </button>

              {abertoId === m.id && <PainelMembro membro={m} aoTrocarCargo={() => trocarCargo(m)} />}
            </li>
          ))}
        </ul>
      )}

      {mostrarForm ? (
        <form className="mt-3 space-y-3 rounded-xl border border-border p-3" onSubmit={cadastrar}>
          <p className="flex items-center gap-1 text-xs font-bold text-primary">
            <UserPlus className="size-3" /> NOVA CONTA
          </p>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Nome completo *</label>
            <input
              required
              autoComplete="off"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Vendedor 2"
              className={inputBase}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">E-mail *</label>
            <input
              required
              type="email"
              inputMode="email"
              autoComplete="off"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="vendedor@email.com"
              className={inputBase}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Cargo *</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["vendedor", "admin"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, cargo: c })}
                  className={`h-12 rounded-xl text-sm font-extrabold uppercase ${
                    form.cargo === c
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {rotuloCargo(c)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Senha *</label>
              <input
                required
                type="password"
                minLength={6}
                autoComplete="new-password"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                placeholder="Mín. 6"
                className={inputBase}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Confirmar *</label>
              <input
                required
                type="password"
                minLength={6}
                autoComplete="new-password"
                value={form.confirmar}
                onChange={(e) => setForm({ ...form, confirmar: e.target.value })}
                placeholder="Repita"
                className={`${inputBase} ${
                  form.confirmar && form.confirmar !== form.senha ? "border-primary" : ""
                }`}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setMostrarForm(false);
                setForm({ ...formVazio });
              }}
              className="h-13 rounded-xl bg-secondary font-extrabold"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={acoes.criar.isPending}
              className="flex h-13 items-center justify-center gap-2 rounded-xl bg-primary font-extrabold text-primary-foreground disabled:opacity-50"
            >
              {acoes.criar.isPending ? <Loader2 className="size-4 animate-spin" /> : "CRIAR"}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setMostrarForm(true)}
          className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-extrabold text-primary-foreground shadow-float"
        >
          <UserPlus className="size-5" /> CADASTRAR USUÁRIO
        </button>
      )}
    </section>
  );
}

function PainelMembro({
  membro,
  aoTrocarCargo,
}: {
  membro: MembroEquipe;
  aoTrocarCargo: () => void;
}) {
  const acoes = useAcoesEquipe();
  const [nome, setNome] = useState(membro.nome);
  const [senha, setSenha] = useState("");
  const [link, setLink] = useState<string | null>(null);

  async function salvarNome() {
    if (nome.trim() === membro.nome) return;
    try {
      await acoes.renomear.mutateAsync({ userId: membro.id, nome: nome.trim() });
      toast.success("Nome atualizado.");
    } catch (err) {
      toast.error(mensagemDeErro(err));
    }
  }

  async function salvarSenha() {
    if (senha.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    try {
      await acoes.trocarSenha.mutateAsync({ userId: membro.id, senha });
      setSenha("");
      toast.success(`Senha de ${membro.nome} alterada.`);
    } catch (err) {
      toast.error(mensagemDeErro(err));
    }
  }

  async function gerarLink() {
    try {
      const r = await acoes.gerarLink.mutateAsync({ email: membro.email });
      setLink(r.url);
      toast.success("Link gerado. Copie e envie ao vendedor.");
    } catch (err) {
      toast.error(mensagemDeErro(err));
    }
  }

  async function copiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o link manualmente.");
    }
  }

  return (
    <div className="space-y-3 border-t border-border bg-background/40 p-3">
      <button
        type="button"
        onClick={aoTrocarCargo}
        disabled={acoes.trocarCargo.isPending}
        className={`flex h-13 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold uppercase disabled:opacity-50 ${
          membro.cargo === "admin" ? "bg-secondary" : "bg-ink text-ink-foreground"
        }`}
      >
        <ShieldCheck className="size-4" />
        {membro.cargo === "admin" ? "Rebaixar para vendedor" : "Promover a admin"}
      </button>

      <div>
        <label className="text-xs font-semibold text-muted-foreground">Nome</label>
        <div className="mt-1 flex gap-2">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="h-13 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={salvarNome}
            disabled={acoes.renomear.isPending || nome.trim() === membro.nome}
            className="flex size-13 shrink-0 items-center justify-center rounded-xl bg-secondary disabled:opacity-40"
            aria-label="Salvar nome"
          >
            <Pencil className="size-4" />
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground">Nova senha</label>
        <div className="mt-1 flex gap-2">
          <input
            type="password"
            value={senha}
            autoComplete="new-password"
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Mín. 6 caracteres"
            className="h-13 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={salvarSenha}
            disabled={acoes.trocarSenha.isPending || senha.length < 6}
            className="flex size-13 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
            aria-label="Salvar senha"
          >
            {acoes.trocarSenha.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <KeyRound className="size-4" />
            )}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={gerarLink}
        disabled={acoes.gerarLink.isPending}
        className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-extrabold uppercase disabled:opacity-50"
      >
        {acoes.gerarLink.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Link2 className="size-4" />
        )}
        Gerar link de redefinição
      </button>

      {link && (
        <div className="rounded-xl bg-secondary p-3">
          <p className="break-all text-xs text-muted-foreground">{link}</p>
          <button
            type="button"
            onClick={copiar}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink text-xs font-extrabold uppercase text-ink-foreground"
          >
            <Copy className="size-3" /> Copiar link
          </button>
        </div>
      )}

      <p className="text-[11px] leading-snug text-muted-foreground">
        Criado em {formatarData(membro.criadoEm)} · Último acesso:{" "}
        {membro.ultimoLogin ? formatarData(membro.ultimoLogin) : "nunca"}
      </p>
    </div>
  );
}

function rotuloCargo(cargo: "admin" | "vendedor") {
  return cargo === "admin" ? "Admin" : "Vendedor";
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const a = partes[0]?.[0] ?? "?";
  const b = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (a + b).toUpperCase();
}

function formatarData(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
}
