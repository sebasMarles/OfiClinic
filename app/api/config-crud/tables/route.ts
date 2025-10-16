// app/api/config-crud/tables/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import fssync from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROOT = process.cwd()
const SCHEMA = path.resolve(ROOT, 'prisma/schema.prisma')
const MODELS_DIR = path.resolve(ROOT, 'config/models')
const OUT_DIR = path.resolve(ROOT, 'config/crud')
const OUT_TABLES = path.join(OUT_DIR, 'configTables.json')
const OUT_DETAIL = path.join(OUT_DIR, 'configTableDetail.json')

type TablesIndex = { models: Array<{ model: string; title: string; status: 'parametrized' | 'inactive' | 'unset' }> }
type AnyObj = Record<string, any>

async function ensureDirAndFiles() {
  if (!fssync.existsSync(OUT_DIR)) await fs.mkdir(OUT_DIR, { recursive: true })
  if (!fssync.existsSync(OUT_TABLES)) await fs.writeFile(OUT_TABLES, JSON.stringify({ models: [] }, null, 2))
  if (!fssync.existsSync(OUT_DETAIL)) await fs.writeFile(OUT_DETAIL, JSON.stringify({}, null, 2))
}

async function loadJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, 'utf-8')
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function parseKeyValueList(str: string) {
  const out: Record<string, string> = {}
  for (const pair of String(str || '').split(',')) {
    const [k, v] = pair.split(':').map(s => s?.trim())
    if (!k) continue
    if (v) out[k] = v.replace(/^['"]|['"]$/g, '')
  }
  return out
}

function toTitle(s: string) {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

async function readAllModelJsons() {
  if (!fssync.existsSync(MODELS_DIR)) return [] as AnyObj[]
  const files = (await fs.readdir(MODELS_DIR)).filter(f => f.endsWith('.json'))
  const out: AnyObj[] = []
  for (const f of files) {
    try {
      const obj = JSON.parse(await fs.readFile(path.join(MODELS_DIR, f), 'utf-8'))
      if (obj?.model) out.push(obj)
    } catch {}
  }
  return out
}

function discoverCrudModels(schemaText: string) {
  const models: Array<{ name: string; meta: Record<string, string> }> = []
  const lines = schemaText.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith('model ')) {
      const m = /^model\s+(\w+)\s*\{/.exec(line)
      if (!m) continue
      const modelName = m[1]
      const window = lines.slice(Math.max(0, i - 5), i).join('\n')
      const crudLine = /\/\/\/\s*@crud(?:\(([^)]*)\))?/i.exec(window)
      const hasCrudDoc = !!crudLine
      const hasPrefix = /^Crud/i.test(modelName) // opcional
      if (hasCrudDoc || hasPrefix) {
        const meta = crudLine?.[1] ? parseKeyValueList(crudLine[1]) : {}
        models.push({ name: modelName, meta })
      }
    }
  }
  return models
}

function parseModelFields(schemaText: string, model: string) {
  const re = new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\}`, 'm')
  const m = re.exec(schemaText)
  if (!m) return []
  return m[1]
    .split('\n')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('//') && !s.startsWith('@@'))
    .map(line => {
      const [name, type, ...rest] = line.split(/\s+/)
      return { name, type, raw: rest.join(' ') }
    })
}

function toColumnConfig(field: { name: string; type: string }) {
  const k = field.name
  const t = field.type.replace('?', '')
  const base: AnyObj = { key: k, title: toTitle(k), sortable: true, filterable: true, type: 'text' }
  if (['Int', 'BigInt', 'Float', 'Decimal'].includes(t)) return { ...base, type: 'number' }
  if (t === 'Boolean') return { ...base, type: 'boolean' }
  if (t === 'DateTime') return { ...base, type: 'date' }
  if (/Email/i.test(k)) return { ...base, type: 'email' }
  return base
}

function pickStatus(meta: AnyObj, fromJson: AnyObj) {
  const allowed = ['parametrized', 'inactive', 'unset']
  const fromMeta = typeof meta?.status === 'string' && allowed.includes(meta.status) ? meta.status : undefined
  const fromCfg = typeof fromJson?.status === 'string' && allowed.includes(fromJson.status) ? fromJson.status : undefined
  return (fromMeta || fromCfg || 'unset') as 'parametrized' | 'inactive' | 'unset'
}

async function generateConfigsInline() {
  const schemaText = await fs.readFile(SCHEMA, 'utf-8')
  const discovered = discoverCrudModels(schemaText) // [{ name, meta }]
  await ensureDirAndFiles()

  const modelJsons = await readAllModelJsons()
  const jsonByModel = new Map(modelJsons.map(j => [String(j.model), j]))

  // Índice
  const tables = await loadJson<TablesIndex>(OUT_TABLES, { models: [] })
  const indexByModel = new Map(tables.models.map((m, i) => [m.model, i]))

  for (const { name, meta } of discovered) {
    const fromJson = jsonByModel.get(name) || {}
    const status = pickStatus(meta, fromJson)
    if (indexByModel.has(name)) {
      const idx = indexByModel.get(name)!
      tables.models[idx].status = status
      if (fromJson?.title) tables.models[idx].title = fromJson.title
    } else {
      tables.models.push({ model: name, title: fromJson?.title || name, status })
      indexByModel.set(name, tables.models.length - 1)
    }
  }
  await fs.writeFile(OUT_TABLES, JSON.stringify(tables, null, 2))

  // Detalle
  const detail = await loadJson<Record<string, AnyObj>>(OUT_DETAIL, {})
  for (const { name, meta } of discovered) {
    const fromJson = jsonByModel.get(name) || {}
    const status = pickStatus(meta, fromJson)

    if (!detail[name]) {
      const fields = parseModelFields(schemaText, name)
      const columnsHeur = fields
        .filter(f => !['id', 'createdAt', 'updatedAt'].includes(f.name))
        .map(toColumnConfig)

      detail[name] = {
        model: name,
        title: fromJson?.title || name,
        description: fromJson?.description || undefined,
        status,
        columns: Array.isArray(fromJson?.columns) && fromJson.columns.length > 0 ? fromJson.columns : columnsHeur,
        rowActions: Array.isArray(fromJson?.rowActions)
          ? fromJson.rowActions
          : [{ id: 'edit', label: 'Editar', icon: 'pencil', variant: 'ghost', action: 'edit' }],
        bulkActions: Array.isArray(fromJson?.bulkActions)
          ? fromJson.bulkActions
          : [{ id: 'export', label: 'Exportar CSV', icon: 'download', variant: 'outline', action: 'export' }],
        relations: Array.isArray(fromJson?.relations) ? fromJson.relations : undefined,
        containerId: fromJson?.containerId || undefined,
      }
    } else {
      detail[name].status = status // sincroniza estado
    }
  }
  await fs.writeFile(OUT_DETAIL, JSON.stringify(detail, null, 2))

  return { tables, detail }
}

// --- GET: lee índice
export async function GET() {
  try {
    await ensureDirAndFiles()
    const tables = await loadJson<TablesIndex>(OUT_TABLES, { models: [] })
    return NextResponse.json(tables, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[config-crud/tables] GET error', e)
    return NextResponse.json({ models: [] }, { status: 200 })
  }
}

// --- POST: genera/actualiza inline (equivalente a "npm run crud:gen")
export async function POST() {
  try {
    const result = await generateConfigsInline()
    return NextResponse.json({ ok: true, models: result.tables.models }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    console.error('[config-crud/tables] POST error', e)
    return NextResponse.json({ error: e?.message || 'failed_to_generate' }, { status: 500 })
  }
}
