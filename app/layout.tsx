import "./globals.css";
import '@/lib/zod-locale'
import type { Metadata } from "next";
import Providers from "@/components/ui/providers";
import Navbar from "@/components/ui/layout/Navbar";

export const metadata: Metadata = {
  title: "OfiClinic",
  description: "Plataforma base OfiClinic (Next.js + Prisma + shadcn + Query)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-gray-50 dark:bg-neutral-950">
        {/* Barra de navegación global */}
        <Navbar />

        {/* Providers + contenido */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
