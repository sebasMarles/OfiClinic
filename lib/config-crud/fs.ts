// lib/config-crud/fs.ts
import fs from 'fs/promises'
import fssync from 'fs'
import path from 'path'

const ROOT = process.cwd()
const MODELS_DIR = path.resolve(ROOT, 'config/models')
const OUT_DIR = path.resolve(ROOT, 'config/crud')
const OUT_TABLES = path.join(OUT_DIR, 'crudTable.json')

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

function pickWritePath(model: string) {
  for (const f of candidatesFor(model)) {
    try { fssync.accessSync(f); return f } catch {}
  }
  return path.join(MODELS_DIR, `${model}.json`)
}

export async function writeModelJson(model: string, obj: any) {
  await ensureDir(MODELS_DIR)
  const file = pickWritePath(model)
  await fs.writeFile(file, JSON.stringify(obj, null, 2))
}

export async function readCrudTable(): Promise<{ models: Array<{ name: string; fields?: any[] }> }> {
  try {
    const raw = await fs.readFile(OUT_TABLES, 'utf-8')
    const obj = raw ? JSON.parse(raw) : { models: [] }
    if (!Array.isArray(obj.models)) obj.models = []
    return obj
  } catch {
    return { models: [] }
  }
}

export async function writeCrudTable(obj: { models: Array<{ name: string; fields?: any[] }> }) {
  await ensureDir(OUT_DIR)
  await fs.writeFile(OUT_TABLES, JSON.stringify(obj, null, 2))
}

export const paths = {
  ROOT, MODELS_DIR, OUT_DIR, OUT_TABLES, SCHEMA: path.resolve(ROOT, 'prisma/schema.prisma')
}

export function existsSync(p: string) {
  try { return fssync.existsSync(p) } catch { return false }
}
