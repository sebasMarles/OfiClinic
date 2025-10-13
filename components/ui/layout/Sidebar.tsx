"use client";

import { usePathname } from "next/navigation";
import Link from "next/link"; 
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

type MenuGroup = {
  label: string;
  items?: { label: string; href: string }[];
};

const menu: MenuGroup[] = [
  {
    label: "Inicio",
  },
  {
    label: "Asistencial",
    items: [
      { label: "Registro de Pacientes", href: "#" },
      { label: "Ver agenda de citas", href: "#" },
      { label: "Consultar Historia Clínica por paciente", href: "#" },
      { label: "Unificar Pacientes", href: "#" },
    ],
  },
  {
    label: "Parametrización",
    items: [
      { label: "Profesionales", href: "#" },
      { label: "Planes y tarifas", href: "#" },
      { label: "Servicios", href: "#" },
      { label: "Pacientes", href: "/crud/Patient" },
      { label: "Profesionales", href: "/crud/Professional" },

    ],
  },
  {
    label: "Recepción",
    items: [
      { label: "Registro de ingresos", href: "#" },
      { label: "Agenda diaria", href: "#" },
    ],
  },
  {
    label: "Facturación",
    items: [
      { label: "Pre-facturas", href: "#" },
      { label: "Facturas", href: "#" },
      { label: "Reportes", href: "#" },
    ],
  },
  {
    label: "Utilidades",
    items: [
      { label: "Informes", href: "#" },
      { label: "Cambiar Contraseña", href: "#" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (group: string) =>
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));

  return (
    <aside
      className={cn(
        // posición
        "fixed left-0 top-14 w-64 h-[calc(100vh-3.5rem)] z-30",
        // apariencia
        "bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 shadow-sm",
        // flex container
        "flex flex-col"
      )}
    >
      {/* Contenedor scrolleable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 scrollbar-thin scrollbar-thumb-purple-500/40 scrollbar-track-transparent hover:scrollbar-thumb-purple-500/60">
        {/* Título */}
        <h1 className="text-2xl font-bold text-purple-600 mb-6 select-none">
          OfiClinic
        </h1>

        <Separator className="mb-4" />

        {/* Navegación */}
        <nav className="flex flex-col gap-2 text-sm">
          {menu.map((group) =>
            group.items ? (
              <Collapsible
                key={group.label}
                open={openGroups[group.label]}
                onOpenChange={() => toggleGroup(group.label)}
              >
                <CollapsibleTrigger
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 font-medium rounded-lg text-neutral-700 dark:text-neutral-300",
                    "hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-150 ease-in-out",
                    "cursor-pointer select-none active:scale-[0.98]"
                  )}
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      openGroups[group.label] && "rotate-180"
                    )}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="flex flex-col pl-4 mt-1 mb-2 border-l border-neutral-200 dark:border-neutral-800">
                    {group.items.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        className={cn(
                          "block px-3 py-1.5 rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors duration-150 ease-in-out",
                          pathname === item.href &&
                            "text-purple-600 font-medium"
                        )}
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <Link
                key={group.label}
                href={group.label === "Inicio" ? "/" : "#"} 
                className={cn(
                  "rounded-lg px-3 py-2 font-medium transition-all duration-150 ease-in-out",
                  "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800",
                  "cursor-pointer select-none active:scale-[0.98]",
                  pathname === "/" && "bg-purple-600 text-white"
                )}
              >
                {group.label}
              </Link>
            )
          )}
        </nav>
      </div>

      {/* Footer fijo al fondo de la sidebar */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
        v0.1.0
      </div>
    </aside>
  );
}
