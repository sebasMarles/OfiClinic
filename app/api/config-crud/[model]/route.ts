// app/api/config-crud/[model]/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import fss from 'fs'
import path from 'path'

const ROOT = process.cwd()
const CRUD_TABLE = path.join(ROOT, 'config/crud/crudTable.json')
const MODELS_DIR = path.join(ROOT, 'config/models')

function exists(p: string) {
  try { fss.accessSync(p); return true } catch { return false }
}

function candidatesFor(model: string) {
  return [
    path.join(MODELS_DIR, `${model}.json`),
    path.join(MODELS_DIR, `${model.toLowerCase()}.json`),
    path.join(MODELS_DIR, `${model.toLowerCase()}s.json`),
  ]
}

function pickWritePath(model: string) {
  // Si hay algún archivo existente (ej: professionals.json), úsalo
  for (const f of candidatesFor(model)) {
    if (exists(f)) return f
  }
  // Si no existe ninguno, crea <Model>.json
  return path.join(MODELS_DIR, `${model}.json`)
}

function readCrudTableModels(): Array<{ name: string; fields?: any[] }> {
  try {
    const raw = fss.readFileSync(CRUD_TABLE, 'utf-8')
    const json = JSON.parse(raw)
    return Array.isArray(json?.models) ? json.models : []
  } catch {
    return []
  }
}

function mapBaseToUiType(fieldKey: string, baseType: string): string {
  if (baseType === 'Boolean') return 'boolean'
  if (baseType === 'DateTime') return 'date'
  if (baseType === 'Number') return 'number'
  // Heurística de email por nombre
  if (/email/i.test(fieldKey)) return 'email'
  return 'text' // String, relaciones, etc.
}

export async function GET(req: Request, ctx: { params: Promise<{ model: string }> }) {
  const { model } = await ctx.params
  const url = new URL(req.url)
  const seed = url.searchParams.get('seed') // ?seed=crudTable

  try {
    // 1) Si hay JSON en config/models, devolverlo
    for (const f of candidatesFor(model)) {
      if (exists(f)) {
        const data = JSON.parse(fss.readFileSync(f, 'utf-8'))
        return NextResponse.json(data)
      }
    }

    // 2) Si piden seed desde crudTable.json (o no hay JSON), construirlo
    const models = readCrudTableModels()
    const entry = models.find(m => m.name === model)

    if (entry) {
      const columns = (entry.fields || [])
        .filter((f: any) => !['id','createdAt','updatedAt'].includes(String(f.key)))
        .map((f: any) => ({
          key: f.key,
          title: f.key.charAt(0).toUpperCase() + f.key.slice(1),
          type: mapBaseToUiType(f.key, f.type),
          baseType: f.type,              // auxiliar para editor (no se persiste en disco)
          sortable: true,
          filterable: true,
          render: 'grid-form',
          required: !!f.required,
        }))

      return NextResponse.json({
        model,
        title: model,
        description: '',
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

    // 3) Fallback mínimo si no está en crudTable
    return NextResponse.json({
      model,
      title: model,
      description: '',
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

    // quita baseType auxiliar si viene desde el editor
    if (Array.isArray(payload?.columns)) {
      payload.columns = payload.columns.map((c: any) => {
        const { baseType, ...rest } = c
        return rest
      })
    }

    await fs.mkdir(MODELS_DIR, { recursive: true })
    const target = pickWritePath(model)
    await fs.writeFile(target, JSON.stringify(payload, null, 2))

    return NextResponse.json({ ok: true, data: payload })
  } catch (e) {
    console.error('[config-crud/[model]] PUT error:', e)
    return NextResponse.json({ error: 'failed_to_save' }, { status: 500 })
  }
}
