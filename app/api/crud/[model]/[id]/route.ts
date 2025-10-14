// app/api/crud/[model]/[id]/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getUseCasesFor } from '@/lib/di'
import { getTableConfig } from '@/lib/config-loader'
import { schemaFromConfig } from '@/domain/validation/schema-from-config'
import type { TableConfig } from '@/types/table-config'

function coercePayloadByConfig(payload: any, cfg: TableConfig) {
  const out: any = {}
  for (const col of cfg.columns) {
    const k = col.key
    if (!(k in payload)) continue
    const v = payload[k]

    switch (col.type) {
      case 'number':
      case 'currency': {
        if (v === '' || v === null || v === undefined) out[k] = undefined
        else {
          const n = Number(v)
          out[k] = Number.isFinite(n) ? n : undefined
        }
        break
      }
      case 'boolean': {
        if (typeof v === 'boolean') out[k] = v
        else if (typeof v === 'string') out[k] = v.toLowerCase() === 'true'
        else out[k] = Boolean(v)
        break
      }
      case 'date': {
        if (!v) { out[k] = undefined; break }
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
          out[k] = new Date(v + 'T00:00:00.000Z')
        } else {
          const d = new Date(v)
          out[k] = Number.isNaN(d.getTime()) ? undefined : d
        }
        break
      }
      case 'text':
      case 'email':
      case 'select':
      case 'badge': {
        out[k] = v == null ? '' : String(v)
        break
      }
      default: out[k] = v
    }
  }
  return out
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ model: string; id: string }> },
) {
  const { model, id } = await context.params
  try {
    const uc = getUseCasesFor((model || '').toLowerCase())
    const record = await uc.get(id)
    return NextResponse.json({ data: record })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch record' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ model: string; id: string }> },
) {
  const { model, id } = await context.params
  const slug = (model || '').toLowerCase()

  try {
    const body = await request.json()
    const cfg = await getTableConfig(slug)
    if (!cfg) return NextResponse.json({ error: `No hay configuración para ${slug}` }, { status: 400 })

    const prepped = coercePayloadByConfig(body, cfg)
    const schema = schemaFromConfig(cfg)
    const parsed = schema.parse(prepped)

    // Chequeos de unicidad (excluyendo el propio id)
    const uc = getUseCasesFor(slug)
    for (const col of cfg.columns.filter(c => c.unique)) {
      const val = (parsed as any)[col.key]
      if (val !== undefined && val !== null && String(val) !== '') {
        const exists = await uc.existsByField(col.key, val, id)
        if (exists) {
          return NextResponse.json(
            { error: 'Validación fallida', details: [{ field: col.key, message: `${col.title} ya está en uso` }] },
            { status: 400 },
          )
        }
      }
    }

    const updated = await uc.update(id, parsed)
    return NextResponse.json({ data: updated })
  } catch (err: any) {
    if (err?.issues) {
      const details = err.issues.map((i: any) => ({
        field: String(i.path?.[0] ?? ''),
        message: i.message,
      }))
      return NextResponse.json({ error: 'Validación fallida', details }, { status: 400 })
    }
    if (err?.code === 'P2002') {
      const targets = Array.isArray(err?.meta?.target) ? err.meta.target : [err?.meta?.target].filter(Boolean)
      const details = (targets as string[]).map((t: string) => ({
        field: t,
        message: `Ya existe un registro con el mismo valor de ${t}`,
      }))
      return NextResponse.json({ error: 'Validación fallida', details }, { status: 400 })
    }
    console.error('API PUT error:', err)
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ model: string; id: string }> },
) {
  const { model, id } = await context.params
  try {
    const uc = getUseCasesFor((model || '').toLowerCase())
    await uc.remove(id)
    return NextResponse.json({ data: { id, deleted: true } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
  }
}
