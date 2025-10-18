export const runtime = "nodejs";

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { prisma } from "@/lib/prisma";

const ROOT = process.cwd();
const TABLE_FILE = path.join(ROOT, "config", "crud", "crudTable.json");

// Util: nombre del "delegate" en Prisma: Tariff -> tariff, ClinicalHistory -> clinicalHistory
function toDelegateName(model: string) {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function readCrudTable(): any | null {
  try {
    const raw = fs.readFileSync(TABLE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { model: string } }
) {
  const { model } = params;
  const delegateName = toDelegateName(model);

  try {
    // 1) meta & details (para saber qué columnas mostrar)
    const cfg = await prisma.configCrud.findUnique({
      where: { model },
      include: { details: true },
    });

    // fallback a crudTable.json para "keys base"
    const tableJson = readCrudTable();
    const entry = tableJson?.models?.find((m: any) => m.name === model);
    const baseKeys: string[] = Array.isArray(entry?.fields)
      ? entry.fields.map((f: any) => String(f.key))
      : [];

    // columnas efectivas con prioridad a detalles (render/hidden)
    let columns: Array<{ key: string; title: string }> = [];
    if (cfg?.details?.length) {
      columns = cfg.details
        .filter(
          (d: any) =>
            (d.render === "grid" || d.render === "grid-form" || !d.render) &&
            !d.hidden
        )
        .map((d: any) => ({ key: d.key, title: d.title || d.key }));
    } else {
      // si no hay detalles aún, usa baseKeys salvo metacampos
      const skip = new Set(["id", "createdAt", "updatedAt"]);
      columns = baseKeys
        .filter((k) => !skip.has(k))
        .map((k) => ({
          key: k,
          title: k.charAt(0).toUpperCase() + k.slice(1),
        }));
    }

    // 2) fetch rows del modelo en Prisma
    const delegate = (prisma as any)[delegateName];
    if (!delegate || typeof delegate.findMany !== "function") {
      return NextResponse.json(
        { error: `Modelo no encontrado en Prisma: ${model}` },
        { status: 404 }
      );
    }

    const take = cfg?.pageSize && cfg.pageSize > 0 ? cfg.pageSize : 10;

    const rowsRaw = await delegate
      .findMany({
        take,
        orderBy: { updatedAt: "desc" }, // si el modelo no tiene updatedAt, hacemos fallback abajo
      })
      .catch(async () => {
        // fallback sin order si el modelo no tiene updatedAt
        return delegate.findMany({ take });
      });

    // 3) proyectar las columnas (omitir objetos/listas para la tabla simple)
    const rows = rowsRaw.map((r: any) => {
      const out: Record<string, any> = {};

      for (const c of columns) {
        const v = r[c.key];

        if (v === null || v === undefined) {
          out[c.key] = null;
          continue;
        }

        if (v instanceof Date) {
          out[c.key] = v.toISOString();
          continue;
        }

        if (typeof v === "object") {
          // relaciones / arrays → mostrarlos como string corto
          out[c.key] = Array.isArray(v) ? `[${v.length}]` : "[obj]";
        } else {
          out[c.key] = v;
        }
      }

      // siempre incluimos id si existe (para futuras acciones)
      if (r.id && !("id" in out)) out.id = r.id;

      return out;
    });

    return NextResponse.json({
      model,
      columns, // [{ key, title }]
      rows, // [{ key:value,... }]
      pageSize: take,
    });
  } catch (e) {
    console.error("[rows GET]", e);
    return NextResponse.json({ error: "rows_failed" }, { status: 500 });
  }
}
