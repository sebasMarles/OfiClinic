"use client";

import { ThemeToggle } from "./ThemeToggle";

export default function HeaderBar({
  userName = "Invitado",
  clientName = "—",
  siteName = "—",
}: {
  userName?: string;
  clientName?: string;
  siteName?: string;
}) {
  return (
    <header className="fixed top-0 inset-x-0 h-14 border-b bg-background/90 backdrop-blur z-50">
      <div className="h-full max-w-screen-2xl mx-auto px-4 flex items-center justify-between">
        {/* Izquierda: Cliente / Sede */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Cliente:</span>
            <span className="font-medium">{clientName}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-muted-foreground">Sede:</span>
            <span className="font-medium">{siteName}</span>
          </div>
        </div>

        {/* Derecha: Usuario + Toggle de Tema */}
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground hidden sm:block">
            <span className="mr-2">👤</span>
            <span className="font-medium">{userName}</span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
