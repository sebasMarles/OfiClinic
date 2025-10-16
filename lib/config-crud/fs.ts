// lib/config-crud/fs.ts
import fs from 'fs/promises'
import fssync from 'fs'
import path from 'path'

const ROOT = process.cwd()
const MODELS_DIR = path.resolve(ROOT, 'config/models')
const OUT_DIR = path.resolve(ROOT, 'config/crud')
const OUT_TABLES = path.join(OUT_DIR, 'configTables.json')
const OUT_DETAIL = path.join(OUT_DIR, 'configTableDetail.json')

async function ensureDir(p: string) {
  try { await fs.mkdir(p, { recursive: true }) } catch {}
}

function candidatesFor(model: string) {
  return [
    path.join(MODELS_DIR, `${model}.json`),
    path.join(MODELS_DIR, `${model.toLowerCase()}.json`),
    path.join(MODELS_DIR, `${model.toLowerCase()}s.json`),
  ]
}

export async function readModelJson(model: string): Promise<any | null> {
  for (const file of candidatesFor(model)) {
    try {
      const raw = await fs.readFile(file, 'utf-8')
      return JSON.parse(raw)
    } catch {}
  }
  return null
}

export async function writeModelJson(model: string, obj: any) {
  await ensureDir(MODELS_DIR)
  const file = path.join(MODELS_DIR, `${model}.json`)
  await fs.writeFile(file, JSON.stringify(obj, null, 2))
}

export async function readConfigDetail(): Promise<Record<string, any>> {
  try {
    const raw = await fs.readFile(OUT_DETAIL, 'utf-8')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export async function writeConfigDetail(detail: Record<string, any>) {
  await ensureDir(OUT_DIR)
  await fs.writeFile(OUT_DETAIL, JSON.stringify(detail, null, 2))
}

export async function readConfigTables(): Promise<{ models: Array<{ model:string; title:string; status:string }> }> {
  try {
    const raw = await fs.readFile(OUT_TABLES, 'utf-8')
    const obj = raw ? JSON.parse(raw) : { models: [] }
    if (!Array.isArray(obj.models)) obj.models = []
    return obj
  } catch {
    return { models: [] }
  }
}

export async function writeConfigTables(obj: { models: Array<{ model:string; title:string; status:string }> }) {
  await ensureDir(OUT_DIR)
  await fs.writeFile(OUT_TABLES, JSON.stringify(obj, null, 2))
}

export async function upsertConfigTablesEntry(entry: { model:string; title:string; status:string }) {
  const tables = await readConfigTables()
  const idx = tables.models.findIndex(m => m.model === entry.model)
  if (idx >= 0) {
    tables.models[idx].title = entry.title
    tables.models[idx].status = entry.status
  } else {
    tables.models.push({ model: entry.model, title: entry.title, status: entry.status })
  }
  await writeConfigTables(tables)
}

// Small helper for sync route to read/write raw files if needed
export const paths = {
  ROOT, MODELS_DIR, OUT_DIR, OUT_TABLES, OUT_DETAIL, SCHEMA: path.resolve(ROOT, 'prisma/schema.prisma')
}

export function existsSync(p: string) {
  try {
    return fssync.existsSync(p)
  } catch { return false }
}
