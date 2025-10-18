// app/api/crud/[model]/check-unique/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getUseCasesFor } from "@/lib/di";

/**
 * Verifica unicidad de un campo: GET ?field=...&value=...&excludeId=...
 * Respuesta: { exists: boolean }
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ model: string }> }
) {
  const { model } = await ctx.params;
  const slug = (model || "").toLowerCase();

  try {
    const url = new URL(req.url);
    const field = url.searchParams.get("field") || "";
    const value = url.searchParams.get("value");
    const excludeId = url.searchParams.get("excludeId") || undefined;

    if (!field) {
      return NextResponse.json({ error: "missing_field" }, { status: 400 });
    }

    const uc = getUseCasesFor(slug);
    const exists = await uc.existsByField(field, value, excludeId);
    return NextResponse.json({ exists });
  } catch (e) {
    console.error("[CHECK UNIQUE GET]", e);
    return NextResponse.json({ error: "unique_failed" }, { status: 500 });
  }
}
