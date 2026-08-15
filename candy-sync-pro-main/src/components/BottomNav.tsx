import { Link, useLocation } from "@tanstack/react-router";
import { Home, ShoppingCart, Package, Users, Settings } from "lucide-react";

const itens = [
  { to: "/inicio", label: "Início", Icon: Home },
  { to: "/pedidos", label: "Pedidos", Icon: ShoppingCart },
  { to: "/produtos", label: "Produtos", Icon: Package },
  { to: "/clientes", label: "Clientes", Icon: Users },
  { to: "/configuracoes", label: "Config", Icon: Settings },
];

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card safe-bottom">
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-1 pt-1">
        {itens.map(({ to, label, Icon }) => {
          const ativo = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition-colors ${
                ativo ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={ativo ? "size-6" : "size-6 opacity-80"} strokeWidth={ativo ? 2.6 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
