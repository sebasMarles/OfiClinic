"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export default function Navbar() {
  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-40",
        "bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-sm",
        "h-14 flex items-center justify-between px-8"
      )}
    >
      

      {/* Links principales */}
      <nav className="flex items-center gap-6 text-sm font-medium text-neutral-700 dark:text-neutral-300">
        <Link href="/" className="hover:text-purple-600 transition-colors">
          Cuenta: 
        </Link>
        <Link href="/about" className="hover:text-purple-600 transition-colors">
          Sede:
        </Link>
      </nav>

      {/* Botón de sesión o placeholder */}
      <div>
        <button className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition">
          Usuario
        </button>
      </div>
    </header>
  );
}
