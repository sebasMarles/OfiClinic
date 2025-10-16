// app/api/config-crud/[model]/route.ts
import { NextResponse } from 'next/server'
import { readModelJson, writeModelJson, readConfigDetail, writeConfigDetail, upsertConfigTablesEntry } from '@/lib/config-crud/fs'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ model: string }> },
) {
  const { model } = await ctx.params
  const key = model

  try {
    // 1) fuente de verdad: config/models/<Model>.json
    const fromModel = await readModelJson(key)
    if (fromModel) return NextResponse.json(fromModel)

    // 2) fallback: config/crud/configTableDetail.json
    const detail = await readConfigDetail()
    if (detail[key]) return NextResponse.json(detail[key])

    // 3) fallback mínimo
    return NextResponse.json({
      model: key,
      title: key,
      status: 'unset',
      columns: [],
    })
  } catch (e) {
    console.error('[config-crud/[model]] GET error:', e)
    return NextResponse.json({ error: 'failed_to_load' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ model: string }> },
) {
  const { model } = await ctx.params
  const key = model

  try {
    const payload = await req.json()

    if (!payload?.model || String(payload.model) !== key) {
      return NextResponse.json({ error: 'model_mismatch' }, { status: 400 })
    }
    if (!Array.isArray(payload?.columns)) {
      return NextResponse.json({ error: 'columns_required' }, { status: 400 })
    }

    // 1) escribe JSON canónico
    await writeModelJson(key, payload)

    // 2) refleja en detail (para compatibilidad de otras pantallas)
    const detail = await readConfigDetail()
    detail[key] = payload
    await writeConfigDetail(detail)

    // 3) asegura índice en tables con título y status
    await upsertConfigTablesEntry({
      model: key,
      title: payload?.title || key,
      status: payload?.status || 'unset',
    })

    return NextResponse.json({ ok: true, data: payload })
  } catch (e) {
    console.error('[config-crud/[model]] PUT error:', e)
    return NextResponse.json({ error: 'failed_to_save' }, { status: 500 })
  }
}
