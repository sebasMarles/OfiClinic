// components/config-crud/editor/KeyDetail.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Detail } from "./types";

type Props = {
  detail: Detail | null;
  allowedTypes: string[];
  onChange: (next: Detail) => void;
  onSave: () => void;
  saving?: boolean;
};

export default function KeyDetail({
  detail,
  allowedTypes,
  onChange,
  onSave,
  saving,
}: Props) {
  if (!detail)
    return (
      <div className="md:col-span-3 border rounded p-4">
        Selecciona un campo.
      </div>
    );

  return (
    <div className="md:col-span-3 border rounded p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Key</Label>
          <Input
            value={detail.key}
            readOnly
            className="bg-muted/50 pointer-events-none"
          />
        </div>

        <div className="space-y-2">
          <Label>Título</Label>
          <Input
            value={detail.title}
            onChange={(e) => onChange({ ...detail, title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Tipo UI</Label>
          {allowedTypes.length === 1 ? (
            <Input
              value={allowedTypes[0]}
              readOnly
              className="bg-muted/50 pointer-events-none"
            />
          ) : (
            <Select
              value={detail.type}
              onValueChange={(v) => onChange({ ...detail, type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label>Render</Label>
          <Select
            value={detail.render ?? "grid-form"}
            onValueChange={(v: any) => onChange({ ...detail, render: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">grid</SelectItem>
              <SelectItem value="form">form</SelectItem>
              <SelectItem value="grid-form">grid-form</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(
          [
            ["sortable", "sortable"],
            ["filterable", "filterable"],
            ["frozen", "frozen"],
            ["required", "required"],
            ["hidden", "hidden"],
            ["hideable", "hideable"],
            ["unique", "unique"], // NUEVO
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!(detail as any)[k]}
              onChange={(e) =>
                onChange({ ...detail, [k]: e.target.checked } as any)
              }
            />
            {label}
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Opciones (solo select/badge) — CSV</Label>
        <Textarea
          value={detail.listOptions ?? ""}
          onChange={(e) => onChange({ ...detail, listOptions: e.target.value })}
          placeholder="Activo,Inactivo,En revisión…"
          rows={3}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Guardando…" : "Guardar campo"}
        </Button>
      </div>
    </div>
  );
}
