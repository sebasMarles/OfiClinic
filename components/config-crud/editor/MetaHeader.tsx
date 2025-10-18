// components/config-crud/editor/MetaHeader.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Meta } from "./types";

type Props = {
  meta: Meta;
  onChange: (next: Meta) => void;
  onSave: () => void;
  saving?: boolean;
};

export default function MetaHeader({ meta, onChange, onSave, saving }: Props) {
  return (
    <div className="border p-3 rounded">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Modelo</Label>
          <Input
            value={meta.model}
            readOnly
            className="bg-muted/50 pointer-events-none"
          />
        </div>
        <div>
          <Label>Título</Label>
          <Input
            value={meta.title}
            onChange={(e) => onChange({ ...meta, title: e.target.value })}
          />
        </div>

        <div>
          <Label>Page size</Label>
          <Input
            type="number"
            value={meta.pageSize ?? 10}
            onChange={(e) =>
              onChange({ ...meta, pageSize: Number(e.target.value || 10) })
            }
          />
        </div>

        <div>
          <Label>Placeholder búsqueda</Label>
          <Input
            value={meta.searchPlaceHolder ?? "Search..."}
            onChange={(e) =>
              onChange({ ...meta, searchPlaceHolder: e.target.value })
            }
          />
        </div>

        <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-6 gap-2">
          {(
            [
              ["enableSelection", "Selección"],
              ["enableMultiSelection", "Multi selección"],
              ["enablePagination", "Paginación"],
              ["enableSearch", "Búsqueda"],
              ["enableFilters", "Filtros"],
              ["enableExport", "Export"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!(meta as any)[k]}
                onChange={(e) =>
                  onChange({ ...meta, [k]: e.target.checked } as any)
                }
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Guardando…" : "Guardar meta"}
        </Button>
      </div>
    </div>
  );
}
