// app/api/config-crud/[model]/meta/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ model: string }> }
) {
  const { model } = await ctx.params;

  try {
    const cfg = await prisma.configCrud.upsert({
      where: { model },
      update: {},
      create: { model, title: model },
    });

    return NextResponse.json({
      id: cfg.id,
      model: cfg.model,
      title: cfg.title,
      enableSelection: cfg.enableSelection ?? true,
      enableMultiSelection: cfg.enableMultiSelection ?? true,
      enablePagination: cfg.enablePagination ?? true,
      pageSize: cfg.pageSize ?? 10,
      enableSearch: cfg.enableSearch ?? true,
      searchPlaceHolder: cfg.searchPlaceHolder ?? "Search...",
      enableFilters: cfg.enableFilters ?? true,
      enableExport: cfg.enableExport ?? true,
      relations: cfg.relations ?? [],
      bulkActions: cfg.bulkActions ?? [],
      rowActions: cfg.rowActions ?? [],
    });
  } catch (e) {
    console.error("[meta GET] error", e);
    return NextResponse.json({ error: "meta_failed" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ model: string }> }
) {
  const { model } = await ctx.params;

  try {
    const body = await req.json();

    const updated = await prisma.configCrud.upsert({
      where: { model },
      update: {
        title: body.title ?? model,
        enableSelection: body.enableSelection,
        enableMultiSelection: body.enableMultiSelection,
        enablePagination: body.enablePagination,
        pageSize: body.pageSize,
        enableSearch: body.enableSearch,
        searchPlaceHolder: body.searchPlaceHolder,
        enableFilters: body.enableFilters,
        enableExport: body.enableExport,
        relations: body.relations ?? [],
        bulkActions: body.bulkActions ?? [],
        rowActions: body.rowActions ?? [],
      },
      create: {
        model,
        title: body.title ?? model,
        enableSelection: body.enableSelection ?? true,
        enableMultiSelection: body.enableMultiSelection ?? true,
        enablePagination: body.enablePagination ?? true,
        pageSize: body.pageSize ?? 10,
        enableSearch: body.enableSearch ?? true,
        searchPlaceHolder: body.searchPlaceHolder ?? "Search...",
        enableFilters: body.enableFilters ?? true,
        enableExport: body.enableExport ?? true,
        relations: body.relations ?? [],
        bulkActions: body.bulkActions ?? [],
        rowActions: body.rowActions ?? [],
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[meta PUT] error", e);
    return NextResponse.json({ error: "save_meta_failed" }, { status: 500 });
  }
}
