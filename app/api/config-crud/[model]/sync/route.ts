// app/api/config-crud/[model]/sync/route.ts
import { NextResponse } from 'next/server'
import { readModelJson } from '@/lib/config-crud/fs'
import { upsertPrismaModelFromConfig } from '@/lib/config-crud/prisma-model-writer'

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ model: string }> },
) {
  const { model } = await ctx.params

  try {
    const conf = await readModelJson(model)
    if (!conf) {
      return NextResponse.json({ error: 'model_json_not_found' }, { status: 404 })
    }

    const result = await upsertPrismaModelFromConfig(conf)
    return NextResponse.json({ ok: true, ...result })
  } catch (e:any) {
    console.error('[config-crud/[model]/sync] error:', e)
    return NextResponse.json({ error: e?.message || 'sync_failed' }, { status: 500 })
  }
}
