// app/api/config-crud/[model]/keys/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TABLE_FILE = path.join(ROOT, "config/crud/crudTable.json");

function mapBase(type: string): "String" | "Number" | "Boolean" | "DateTime" {
  if (type === "Number") return "Number";
  if (type === "Boolean") return "Boolean";
  if (type === "DateTime") return "DateTime";
  return "String";
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ model: string }> }
) {
  const { model } = await ctx.params;

  try {
    const raw = fs.readFileSync(TABLE_FILE, "utf-8");
    const json = JSON.parse(raw);
    const entry = (json.models as any[]).find((m) => m.name === model);

    if (!entry) {
      return NextResponse.json({ model, keys: [] });
    }

    const keys = (entry.fields || []).map((f: any) => ({
      key: f.key,
      baseType: mapBase(String(f.type)),
      required: !!f.required,
    }));

    return NextResponse.json({ model, keys });
  } catch (e) {
    console.error("[keys GET] error", e);
    return NextResponse.json({ error: "keys_failed" }, { status: 500 });
  }
}
