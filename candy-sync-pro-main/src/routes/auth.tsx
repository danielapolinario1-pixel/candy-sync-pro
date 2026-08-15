import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LOGO_SSD } from "@/lib/empresa";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar | SSD ATACADO" },
      { name: "description", content: "Acesso dos vendedores externos da SSD Atacado de doces e bebidas." },
      { property: "og:title", content: "Entrar | SSD ATACADO" },
      { property: "og:description", content: "Acesso dos vendedores externos da SSD Atacado." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/inicio", replace: true });
    });
  }, [navigate]);

  function traduzir(msg: string) {
    const m = msg.toLowerCase();
    if (m.includes("weak") || m.includes("pwned")) return "Senha muito fácil de adivinhar. Use uma senha mais forte (8+ caracteres, com letras e números).";
    if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos. Se ainda não tem conta, toque em 'Criar conta de vendedor'.";
    if (m.includes("already registered") || m.includes("already been registered")) return "Este e-mail já tem conta. Toque em 'Já tenho conta' para entrar.";
    if (m.includes("password should be at least")) return "A senha deve ter no mínimo 6 caracteres.";
    if (m.includes("email not confirmed")) return "E-mail ainda não confirmado. Confira sua caixa de entrada.";
    if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde um minuto e tente de novo.";
    return msg;
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
        if (error) throw error;
        await navigate({ to: "/inicio", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: { emailRedirectTo: window.location.origin, data: { nome: nome.trim() || email.split("@")[0] } },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Conta criada!");
          await navigate({ to: "/inicio", replace: true });
        } else {
          toast.success("Conta criada! Faça login.");
          setModo("entrar");
        }
      }
    } catch (err) {
      const mensagem = traduzir(err instanceof Error ? err.message : "Não foi possível continuar");
      setErro(mensagem);
      toast.error(mensagem);
    } finally {
      setCarregando(false);
    }
  }


  return (
    <div className="flex min-h-screen flex-col bg-ink px-6 py-12 text-ink-foreground">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 w-full max-w-[16rem] rounded-2xl bg-white p-4 shadow-float">
            <img src={LOGO_SSD} alt="SSD Atacado Distribuidora" className="h-auto w-full object-contain" />
          </div>
          <h1 className="sr-only">SSD ATACADO</h1>
          <p className="mt-1 text-sm text-white/60">Doces • Bebidas • Salgadinhos</p>
        </div>

        <form onSubmit={enviar} className="space-y-4">
          {modo === "criar" && (
            <input
              className="h-14 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-base outline-none placeholder:text-white/40 focus:border-primary"
              placeholder="Seu nome (ex: Vendedor 1)"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          )}
          <input
            type="email"
            required
            autoComplete="email"
            className="h-14 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-base outline-none placeholder:text-white/40 focus:border-primary"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="relative">
            <input
              type={mostrarSenha ? "text" : "password"}
              required
              minLength={modo === "criar" ? 8 : 6}
              autoComplete={modo === "entrar" ? "current-password" : "new-password"}
              className="h-14 w-full rounded-xl border border-white/15 bg-white/5 px-4 pr-14 text-base outline-none placeholder:text-white/40 focus:border-primary"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setMostrarSenha((atual) => !atual)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-foreground hover:bg-white/10 hover:text-ink-foreground"
            >
              {mostrarSenha ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          {modo === "criar" && (
            <p className="text-xs text-white/50">
              Use uma senha forte: mínimo 8 caracteres, com letras e números. Senhas comuns (ex: 123456) são bloqueadas.
            </p>
          )}

          {erro && (
            <div role="alert" className="rounded-lg border border-primary/50 bg-primary/10 px-4 py-3 text-sm text-ink-foreground">
              {erro}
            </div>
          )}

          <Button
            type="submit"
            disabled={carregando}
            className="h-14 w-full rounded-xl text-lg font-bold shadow-float active:scale-[0.99]"
          >
            {carregando ? "Aguarde..." : modo === "entrar" ? "ENTRAR" : "CRIAR CONTA"}
          </Button>
        </form>

        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setModo(modo === "entrar" ? "criar" : "entrar");
            setErro("");
            setSenha("");
          }}
          className="mt-6 w-full text-center text-sm text-white/60 underline hover:bg-white/10 hover:text-ink-foreground"
        >
          {modo === "entrar" ? "Criar conta de vendedor" : "Já tenho conta"}
        </Button>
      </div>
    </div>
  );
}
