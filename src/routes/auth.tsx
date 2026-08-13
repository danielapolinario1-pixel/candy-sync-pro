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
      { name: "description", content: "Acesso restrito aos usuários autorizados da SSD Atacado." },
      { property: "og:title", content: "Entrar | SSD ATACADO" },
      { property: "og:description", content: "Acesso restrito aos usuários autorizados da SSD Atacado." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
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
    if (m.includes("invalid login credentials")) {
      return "E-mail ou senha incorretos. Contas são criadas apenas pelo administrador.";
    }
    if (m.includes("email not confirmed")) return "E-mail ainda não confirmado. Confira sua caixa de entrada.";
    if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde um minuto e tente de novo.";
    if (m.includes("user not found") || m.includes("signup")) {
      return "Usuário não encontrado. Solicite acesso ao administrador.";
    }
    return msg;
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });
      if (error) throw error;
      await navigate({ to: "/inicio", replace: true });
    } catch (err) {
      const mensagem = traduzir(err instanceof Error ? err.message : "Não foi possível entrar");
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
          <p className="mt-3 text-xs text-white/45">Acesso restrito — contas criadas apenas pelo administrador.</p>
        </div>

        <form onSubmit={enviar} className="space-y-4">
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
              minLength={6}
              autoComplete="current-password"
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
            {carregando ? "Aguarde..." : "ENTRAR"}
          </Button>
        </form>
      </div>
    </div>
  );
}
