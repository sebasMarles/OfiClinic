// app/api/config-crud/[model]/details/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { model: string } }
) {
  const { model } = params;

  try {
    const cfg = await prisma.configCrud.upsert({
      where: { model },
      update: {},
      create: { model, title: model },
      include: { details: true },
    });

    return NextResponse.json({
      model: cfg.model,
      details: cfg.details.map((d) => ({
        id: d.id,
        key: d.key,
        type: d.type,
        title: d.title,
        sortable: d.sortable ?? true,
        filterable: d.filterable ?? true,
        frozen: d.frozen ?? false,
        required: d.required ?? false,
        hidden: d.hidden ?? false,
        hideable: d.hideable ?? false,
        render: (d.render as any) ?? "grid-form",
        listOptions: d.listOptions ?? null,
        unique: d.unique ?? false,
      })),
    });
  } catch (e) {
    console.error("[details GET] error", e);
    return NextResponse.json({ error: "details_failed" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { model: string } }
) {
  const { model } = params;

  try {
    const body = await req.json();
    const { key, data } = body as {
      key: string;
      data: Partial<{
        type: string;
        title: string;
        sortable: boolean;
        filterable: boolean;
        frozen: boolean;
        required: boolean;
        hidden: boolean;
        hideable: boolean;
        render: "grid" | "form" | "grid-form";
        listOptions: string | null;
        unique: boolean;
      }>;
    };

    if (!key) {
      return NextResponse.json({ error: "missing_key" }, { status: 400 });
    }

    const cfg = await prisma.configCrud.upsert({
      where: { model },
      update: {},
      create: { model, title: model },
    });

    const detail = await prisma.configCrudDetail.upsert({
      where: {
        configCrudId_key: { configCrudId: cfg.id, key },
      },
      update: {
        type: data.type,
        title: data.title,
        sortable: data.sortable,
        filterable: data.filterable,
        frozen: data.frozen,
        required: data.required,
        hidden: data.hidden,
        hideable: data.hideable,
        render: data.render,
        listOptions: data.listOptions ?? null,
        unique: data.unique ?? false,
      },
      create: {
        configCrudId: cfg.id,
        key,
        type: data.type ?? "text",
        title: data.title ?? key,
        sortable: data.sortable ?? true,
        filterable: data.filterable ?? true,
        frozen: data.frozen ?? false,
        required: data.required ?? false,
        hidden: data.hidden ?? false,
        hideable: data.hideable ?? false,
        render: data.render ?? "grid-form",
        listOptions: data.listOptions ?? null,
        unique: data.unique ?? false,
      },
    });

    return NextResponse.json({ ok: true, detail });
  } catch (e) {
    console.error("[details PUT] error", e);
    return NextResponse.json({ error: "save_detail_failed" }, { status: 500 });
  }
}
