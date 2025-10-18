import type { Metadata } from "next";
import "./globals.css";
import RootProviders from "@/components/provider/RootProviders";
import HeaderBar from "@/components/ui/headerBar";

export const metadata: Metadata = {
  title: "Oficlinic",
  description: "Panel de gestión",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Reemplazar por lecturas reales (auth/cookies/db)
  const userName = "Usuario";
  const clientName = "—";
  const siteName = "—";

  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <RootProviders>
          {/* Header global: usuario + cliente/sede + toggle de tema */}
          <HeaderBar
            userName={userName}
            clientName={clientName}
            siteName={siteName}
          />
          {children}
        </RootProviders>
      </body>
    </html>
  );
}
