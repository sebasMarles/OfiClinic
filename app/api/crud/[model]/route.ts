// app/api/crud/[model]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUseCasesFor } from "@/lib/di";

function toClientKey(m: string) {
  return m.slice(0, 1).toLowerCase() + m.slice(1);
}

export async function GET(
  req: Request,
  { params }: { params: { model: string } }
) {
  const { model } = params;
  const url = new URL(req.url);
  const take = Number(url.searchParams.get("take") || 50);
  const skip = Number(url.searchParams.get("skip") || 0);

  try {
    const key = toClientKey(model);
    const delegate = (prisma as any)[key];
    if (!delegate?.findMany) {
      return NextResponse.json({ error: "model_not_found" }, { status: 400 });
    }

    const data = await delegate.findMany({
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data });
  } catch (e) {
    console.error("[crud list] error", e);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { model: string } }
) {
  const { model } = params;
  try {
    const body = await req.json();
    const uc = getUseCasesFor(model);
    const created = await uc.create(body);
    return NextResponse.json({ data: created });
  } catch (e: any) {
    if (e?.status === 409) {
      return NextResponse.json(
        { error: e.message || "conflict" },
        { status: 409 }
      );
    }
    console.error("[crud create] error", e);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
}
