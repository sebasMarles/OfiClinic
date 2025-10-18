// app/api/crud/[model]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getUseCasesFor } from "@/lib/di";

/**
 * Lista con paginación/orden/búsqueda.
 * Devuelve shape compatible con useFetchItems(): { data, pagination }
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ model: string }> }
) {
  const { model } = await ctx.params;
  const slug = (model || "").toLowerCase();

  try {
    const url = new URL(req.url);

    // Parámetros soportados
    const page = Number(url.searchParams.get("page") || "1");
    // soporte "pageSize" y "take" (algunas vistas piden take=500)
    const pageSize = Number(
      url.searchParams.get("pageSize") || url.searchParams.get("take") || "10"
    );
    const search = url.searchParams.get("search") || "";
    const sortBy = url.searchParams.get("sortBy") || undefined;
    const sortOrder =
      (url.searchParams.get("sortOrder") as "asc" | "desc" | null) || undefined;

    const uc = getUseCasesFor(slug);
    const { data, total } = await uc.list({
      page,
      pageSize,
      search,
      sortBy,
      sortOrder,
    });

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      data,
      pagination: { page, pageSize, total, totalPages },
    });
  } catch (e) {
    console.error("[CRUD GET]", e);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
}

/**
 * Crear registro.
 * Devuelve shape { data } compatible con useCreateItem().
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ model: string }> }
) {
  const { model } = await ctx.params;
  const slug = (model || "").toLowerCase();

  try {
    const body = await req.json();
    const uc = getUseCasesFor(slug);
    const created = await uc.create(body);
    return NextResponse.json({ data: created });
  } catch (e) {
    console.error("[CRUD POST]", e);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
}
