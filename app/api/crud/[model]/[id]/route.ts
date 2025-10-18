// app/api/crud/[model]/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getUseCasesFor } from "@/lib/di";

/**
 * Obtener por id -> { data }
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ model: string; id: string }> }
) {
  const { model, id } = await ctx.params;
  const slug = (model || "").toLowerCase();

  try {
    const uc = getUseCasesFor(slug);
    const data = await uc.get(id);
    return NextResponse.json({ data });
  } catch (e) {
    console.error("[CRUD ID GET]", e);
    return NextResponse.json({ error: "get_failed" }, { status: 500 });
  }
}

/**
 * Actualizar por id -> { data }
 * Compatible con useUpdateItem().
 */
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ model: string; id: string }> }
) {
  const { model, id } = await ctx.params;
  const slug = (model || "").toLowerCase();

  try {
    const body = await req.json();
    const uc = getUseCasesFor(slug);
    const updated = await uc.update(id, body);
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("[CRUD ID PUT]", e);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}

/**
 * Eliminar por id.
 * Compatible con useDeleteItem() (no exige forma concreta).
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ model: string; id: string }> }
) {
  const { model, id } = await ctx.params;
  const slug = (model || "").toLowerCase();

  try {
    const uc = getUseCasesFor(slug);
    const resp = await uc.remove(id);
    return NextResponse.json(resp); // { id, deleted: true }
  } catch (e) {
    console.error("[CRUD ID DELETE]", e);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
