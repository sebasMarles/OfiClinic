// app/api/config-crud/[model]/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import fss from 'fs'
import path from 'path'

const ROOT = process.cwd()
const DETAIL_PATH = path.join(ROOT, 'config/crud/configTableDetail.json')
const CRUD_TABLE = path.join(ROOT, 'config/crud/crudTable.json')
const MODELS_DIR = path.join(ROOT, 'config/models')

async function ensureDetailFile() {
  try { await fs.access(DETAIL_PATH) }
  catch {
    await fs.mkdir(path.dirname(DETAIL_PATH), { recursive: true })
    await fs.writeFile(DETAIL_PATH, JSON.stringify({}, null, 2))
  }
}

function exists(p: string) { try { fss.accessSync(p); return true } catch { return false } }

function readCrudTable() {
  try {
    const raw = fss.readFileSync(CRUD_TABLE, 'utf-8')
    const json = JSON.parse(raw)
    return Array.isArray(json?.models) ? json.models : []
  } catch { return [] }
}

function mapBaseToUiType(fieldKey: string, baseType: string): string {
  if (baseType === 'Boolean') return 'boolean'
  if (baseType === 'DateTime') return 'date'
  if (baseType === 'Number') return 'number'
  // Heurística de email por nombre
  if (/email/i.test(fieldKey)) return 'email'
  return 'text'
}

export async function GET(req: Request, ctx: { params: Promise<{ model: string }> }) {
  const { model } = await ctx.params
  const url = new URL(req.url)
  const seed = url.searchParams.get('seed') // seed=crudTable

  try {
    await ensureDetailFile()
    const raw = await fs.readFile(DETAIL_PATH, 'utf-8')
    const detail = raw ? JSON.parse(raw) : {}

    // 1) seed desde crudTable.json si lo piden
    if (seed === 'crudTable') {
      const models = readCrudTable()
      const entry = models.find((m: any) => m.name === model)
      if (!entry) {
        return NextResponse.json({
          model,
          title: model,
          description: '',
          status: 'unset',
          columns: [],
          rowActions: [],
          bulkActions: [],
        })
      }
      const columns = (entry.fields || [])
        .filter((f: any) => !['id','createdAt','updatedAt'].includes(String(f.key)))
        .map((f: any) => ({
          key: f.key,
          title: f.key.charAt(0).toUpperCase() + f.key.slice(1),
          type: mapBaseToUiType(f.key, f.type),
          baseType: f.type,              // auxiliar para el editor (no es obligatorio persistir)
          sortable: true,
          filterable: true,
          render: 'grid-form',
          required: !!f.required,
        }))
      return NextResponse.json({
        model,
        title: model,
        description: '',
        status: 'unset',
        columns,
        rowActions: [
          { id: 'view', label: 'Ver', icon: 'eye', variant: 'ghost', action: 'view' },
          { id: 'edit', label: 'Editar', icon: 'pencil', variant: 'ghost', action: 'edit' },
          { id: 'delete', label: 'Eliminar', icon: 'trash', variant: 'destructive', action: 'delete', confirmMessage: '¿Eliminar registro?' }
        ],
        bulkActions: [
          { id: 'delete', label: 'Eliminar Seleccionados', icon: 'trash', variant: 'destructive', action: 'delete' },
          { id: 'export', label: 'Exportar CSV', icon: 'download', variant: 'outline', action: 'export' }
        ],
      })
    }

    // 2) existente en detail.json
    if (detail[model]) return NextResponse.json(detail[model])

    // 3) semilla desde config/models/* (si existiera)
    const candidates = [
      path.join(MODELS_DIR, `${model}.json`),
      path.join(MODELS_DIR, `${model.toLowerCase()}.json`),
      path.join(MODELS_DIR, `${model.toLowerCase()}s.json`),
    ]
    for (const f of candidates) {
      if (exists(f)) {
        const seed = JSON.parse(fss.readFileSync(f, 'utf-8'))
        return NextResponse.json(seed)
      }
    }

    // 4) fallback
    return NextResponse.json({
      model,
      title: model,
      description: '',
      status: 'unset',
      columns: [],
      rowActions: [],
      bulkActions: [],
    })
  } catch (e) {
    console.error('[config-crud/[model]] GET error:', e)
    return NextResponse.json({ error: 'failed_to_load' }, { status: 500 })
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ model: string }> }) {
  const { model } = await ctx.params
  try {
    const payload = await req.json()

    // coherencia: el JSON guardado debe coincidir con la ruta
    if (payload?.model && payload.model !== model) {
      return NextResponse.json({ error: 'model_mismatch' }, { status: 400 })
    }

    // limpia baseType auxiliar si viene
    if (Array.isArray(payload?.columns)) {
      payload.columns = payload.columns.map((c: any) => {
        const { baseType, ...rest } = c
        return rest
      })
    }

    await ensureDetailFile()
    const raw = await fs.readFile(DETAIL_PATH, 'utf-8')
    const detail = raw ? JSON.parse(raw) : {}
    detail[model] = payload
    await fs.writeFile(DETAIL_PATH, JSON.stringify(detail, null, 2))
    return NextResponse.json({ ok: true, data: detail[model] })
  } catch (e) {
    console.error('[config-crud/[model]] PUT error:', e)
    return NextResponse.json({ error: 'failed_to_save' }, { status: 500 })
  }
}
