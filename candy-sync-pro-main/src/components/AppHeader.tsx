import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export function AppHeader({
  titulo,
  voltarPara,
  acao,
}: {
  titulo: string;
  voltarPara?: string;
  acao?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 bg-ink text-ink-foreground safe-top">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-3">
        {voltarPara ? (
          <Link to={voltarPara} className="-ml-2 rounded-full p-2 active:bg-white/10">
            <ChevronLeft className="size-6" />
          </Link>
        ) : (
          <span className="ml-1 size-3 rounded-sm bg-primary" />
        )}
        <h1 className="flex-1 truncate text-lg font-bold tracking-tight">{titulo}</h1>
        {acao}
      </div>
    </header>
  );
}
