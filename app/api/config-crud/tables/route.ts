// app/api/config-crud/tables/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'

// --- paths ---
const ROOT = process.cwd()
const SCHEMA = path.resolve(ROOT, 'prisma/schema.prisma')
const OUT_DIR = path.resolve(ROOT, 'config/crud')
const OUT_CRUD = path.join(OUT_DIR, 'crudTable.json')

// --- helpers de lectura/escritura ---
function safeParse<T = any>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) } catch { return fallback as T }
}

async function ensureOutDir() {
  await fsp.mkdir(OUT_DIR, { recursive: true })
}

function fileExists(p: string) {
  try { fs.accessSync(p); return true } catch { return false }
}

// --- generador embebido (misma lógica del script) ---
function baseTypeFrom(token: string): 'String'|'Number'|'Boolean'|'DateTime' {
  const t = token.replace('?', '').replace('[]', '')
  if (['Int','BigInt','Float','Decimal'].includes(t)) return 'Number'
  if (t === 'Boolean') return 'Boolean'
  if (t === 'DateTime') return 'DateTime'
  return 'String'
}

function discoverCrudModels(schemaText: string): string[] {
  const models: string[] = []
  const lines = schemaText.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith('model ')) {
      const m = /^model\s+(\w+)\s*\{/.exec(line)
      if (!m) continue
      const name = m[1]
      const window = lines.slice(Math.max(0, i - 5), i).join('\n')
      const hasCrudDoc = /\/\/\/\s*@crud/i.test(window)
      const hasPrefix = /^Crud/i.test(name)
      if (hasCrudDoc || hasPrefix) models.push(name)
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
      const [name, typeToken] = line.split(/\s+/)
      const required = !/\?$/.test(typeToken || '')
      const base = baseTypeFrom(typeToken || 'String')
      return { key: name, type: base, required }
    })
    .filter(f => !['id','createdAt','updatedAt'].includes(String(f.key)))
}

async function generateCrudTableJson() {
  const schema = await fsp.readFile(SCHEMA, 'utf-8')
  const models = discoverCrudModels(schema)

  const out = {
    models: models.map(name => ({
      name,
      fields: parseModelFields(schema, name).map(f => ({
        key: f.key,
        type: f.type,       // "String" | "Number" | "Boolean" | "DateTime"
        required: !!f.required,
      })),
    })),
  }

  await ensureOutDir()
  await fsp.writeFile(OUT_CRUD, JSON.stringify(out, null, 2))
  return out
}

async function readCrudTable() {
  if (!fileExists(OUT_CRUD)) return { models: [] as Array<{ name: string }> }
  const raw = await fsp.readFile(OUT_CRUD, 'utf-8')
  const json = safeParse(raw, { models: [] })
  return json
}

// --- handler ---
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const run = searchParams.get('run')

    if (run === '1') {
      // ejecuta generador embebido
      await generateCrudTableJson()
    }

    const current = await readCrudTable()
    // La UI solo necesita { name }
    const list = Array.isArray(current.models)
      ? current.models.map((m: any) => ({ name: m.name }))
      : []

    return NextResponse.json({ data: list })
  } catch (e) {
    console.error('[config-crud/tables] GET error:', e)
    return NextResponse.json({ data: [] }, { status: 500 })
  }
}
