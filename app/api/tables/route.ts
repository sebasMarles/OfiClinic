// app/api/tables/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs/promises";
import fss from "fs";
import path from "path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "config", "crud");
const OUT_FILE = path.join(OUT_DIR, "crudTable.json");

export async function GET() {
  try {
    if (!fss.existsSync(OUT_FILE)) {
      return NextResponse.json({ data: [] }); // sin 404, solo vacío
    }
    const raw = await fs.readFile(OUT_FILE, "utf-8");
    const json = JSON.parse(raw);
    const models = Array.isArray(json?.models)
      ? json.models
          .filter((m: any) => m?.name)
          .map((m: any) => ({ name: String(m.name) }))
      : [];
    return NextResponse.json({ data: models });
  } catch (e) {
    console.error("[GET /api/tables] error:", e);
    // Devuelve vacío para que el UI no “reviente”
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
