import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  children: ReactNode;
  /** Rota de login (padrão: /auth). */
  redirectTo?: "/auth";
};

/**
 * Protege telas internas: sem sessão válida, redireciona para o login.
 * Complementa o `beforeLoad` das rotas autenticadas (bloqueio por URL + por renderização).
 */
export function ProtectedRoute({ children, redirectTo = "/auth" }: Props) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    let ativo = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (!sessionUser) {
        void navigate({ to: redirectTo, replace: true });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (!sessionUser) {
        void navigate({ to: redirectTo, replace: true });
      }
    });

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, redirectTo]);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Verificando acesso...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Redirecionando para o login...</p>
      </div>
    );
  }

  return <>{children}</>;
}
