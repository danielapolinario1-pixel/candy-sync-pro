import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { sincronizarPedidos } from "@/lib/offline";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

function Layout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    const canal = supabase
      .channel("ssd-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "produtos" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["produtos"] });
        void queryClient.invalidateQueries({ queryKey: ["estoque"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["clientes"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "movimentacoes_estoque" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["movimentacoes"] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [queryClient]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        void router.invalidate();
        void router.navigate({ to: "/auth", replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    async function sincronizar() {
      const enviados = await sincronizarPedidos();
      if (enviados > 0) {
        toast.success(`${enviados} pedido(s) offline sincronizado(s)`);
        void queryClient.invalidateQueries({ queryKey: ["pedidos"] });
        void queryClient.invalidateQueries({ queryKey: ["produtos"] });
      }
    }
    const aoConectar = () => void sincronizar();
    void sincronizar();
    window.addEventListener("online", aoConectar);
    const timer = window.setInterval(aoConectar, 60_000);
    return () => {
      window.removeEventListener("online", aoConectar);
      window.clearInterval(timer);
    };
  }, [queryClient]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-24">
        <Outlet />
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
