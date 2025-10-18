import { ReactNode } from "react";
import Sidebar from "@/components/ui/layout/Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 pt-14">
      {/* Sidebar */}
      <Sidebar />

      {/* Contenido principal */}
      <main className="pl-68 p-6 overflow-y-auto min-h-screen">{children}</main>
    </div>
  );
}
