// components/config-crud/CrudConfigGrid.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type ModelItem = { name: string };

async function fetchModels(): Promise<{ data: ModelItem[] }> {
  // 1) intenta /api/tables
  let res = await fetch("/api/tables", { cache: "no-store" });
  if (res.ok) return res.json();

  // 2) si 404 u otro error, intenta alias /api/config-crud/tables
  res = await fetch("/api/config-crud/tables", { cache: "no-store" });
  if (res.ok) return res.json();

  // 3) último recurso: vacío (evita throw para no pintar error rojo)
  return { data: [] };
}

export default function CrudConfigGrid() {
  const { data, isLoading, refetch } = useQuery<{ data: ModelItem[] }>({
    queryKey: ["config-crud", "tables"],
    queryFn: fetchModels,
  });

  const runScript = async () => {
    try {
      // intenta POST /api/tables/rebuild
      let res = await fetch("/api/tables/rebuild", {
        method: "POST",
        cache: "no-store",
      });
      if (!res.ok) {
        // fallback: GET /api/config-crud/tables?run=1
        res = await fetch("/api/config-crud/tables?run=1", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("script_failed");
      }
      toast.success("Script ejecutado");
      refetch();
    } catch {
      toast.error("No se pudo ejecutar el script");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando…
      </div>
    );
  }

  const items = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Modelos (desde <code>crudTable.json</code>)
        </h3>
        <Button variant="outline" size="sm" onClick={runScript}>
          <RefreshCw className="h-4 w-4 mr-2" /> Ejecutar Script
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin modelos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-neutral-500">
            Aún no hay entradas en <code>config/crud/crudTable.json</code>.
            Ejecuta tu script para generarlas.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((m) => (
            <Card key={m.name} className="transition">
              <CardHeader>
                <CardTitle className="text-base">{m.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-neutral-500">
                  Rutas: <code>/config-crud/{m.name}</code> y{" "}
                  <code>/crud/{m.name}</code>
                </div>

                <div className="flex gap-2">
                  <Link href={`/config-crud/${m.name}`}>
                    <Button size="sm" variant="default">
                      Configurar Modelo
                    </Button>
                  </Link>
                  <Link href={`/crud/${m.name}`}>
                    <Button size="sm" variant="outline">
                      Gestionar Modelo
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
