// prisma/scripts/ensure-model-jsons.mjs
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const CRUD_TABLE = path.resolve(ROOT, 'config/crud/crudTable.json')
const MODELS_DIR = path.resolve(ROOT, 'config/models')

const EXCLUDE_FIELDS = new Set(['id', 'createdAt', 'updatedAt'])

function titleize(s) {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Mapeo Prisma→UI por defecto (para columnas nuevas)
function mapPrismaToUiType(prismaType, fieldKey) {
  const t = String(prismaType)
  if (['Int','BigInt','Float','Decimal','Number'].includes(t)) return 'number'
  if (t === 'Boolean') return 'boolean'
  if (t === 'DateTime') return 'date'
  if (/email/i.test(fieldKey)) return 'email'
  return 'text' // String, Json, Bytes, relaciones -> text por defecto
}

function loadCrudTable() {
  if (!fs.existsSync(CRUD_TABLE)) {
    console.error('❌ No existe config/crud/crudTable.json. Ejecuta el generador primero.')
    process.exit(1)
  }
  try {
    const data = JSON.parse(fs.readFileSync(CRUD_TABLE, 'utf-8'))
    if (!data?.models || !Array.isArray(data.models)) throw new Error('shape inválida')
    return data
  } catch (e) {
    console.error('❌ No se pudo leer crudTable.json:', e.message)
    process.exit(1)
  }
}

function ensureDir() {
  if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true })
}

function defaultSeedFor(name, fields) {
  const columns = fields
    .filter(f => !EXCLUDE_FIELDS.has(f.key))
    .map(f => ({
      key: f.key,
      title: titleize(f.key),
      type: mapPrismaToUiType(f.type, f.key),
      sortable: true,
      filterable: true
    }))

  return {
    model: name,
    title: name,
    description: '',
    columns,
    rowActions: [
      { id: 'view', label: 'Ver', icon: 'eye', variant: 'ghost', action: 'view' },
      { id: 'edit', label: 'Editar', icon: 'pencil', variant: 'ghost', action: 'edit' },
      { id: 'delete', label: 'Eliminar', icon: 'trash', variant: 'destructive', action: 'delete', confirmMessage: '¿Eliminar este registro?' }
    ],
    bulkActions: [
      { id: 'export', label: 'Exportar CSV', icon: 'download', variant: 'outline', action: 'export' }
    ]
  }
}

function mergeExistingWithSchema(existing, fields) {
  const desiredKeys = new Set(fields.filter(f => !EXCLUDE_FIELDS.has(f.key)).map(f => f.key))
  const byKey = new Map((existing.columns || []).map(c => [c.key, c]))

  // Mantener existentes que sigan en el schema
  const kept = (existing.columns || []).filter(c => desiredKeys.has(c.key))

  // Agregar nuevos
  const newOnes = fields
    .filter(f => !EXCLUDE_FIELDS.has(f.key))
    .filter(f => !byKey.has(f.key))
    .map(f => ({
      key: f.key,
      title: titleize(f.key),
      type: mapPrismaToUiType(f.type, f.key),
      sortable: true,
      filterable: true
    }))

  const merged = { ...existing, columns: [...kept, ...newOnes] }

  if (!Array.isArray(merged.rowActions)) {
    merged.rowActions = [
      { id: 'view', label: 'Ver', icon: 'eye', variant: 'ghost', action: 'view' },
      { id: 'edit', label: 'Editar', icon: 'pencil', variant: 'ghost', action: 'edit' },
      { id: 'delete', label: 'Eliminar', icon: 'trash', variant: 'destructive', action: 'delete', confirmMessage: '¿Eliminar este registro?' }
    ]
  }
  if (!Array.isArray(merged.bulkActions)) {
    merged.bulkActions = [
      { id: 'export', label: 'Exportar CSV', icon: 'download', variant: 'outline', action: 'export' }
    ]
  }
  return merged
}

function run() {
  const crud = loadCrudTable()
  ensureDir()

  let created = 0
  let updated = 0

  for (const m of crud.models) {
    const name = m.name
    const fields = Array.isArray(m.fields) ? m.fields : []
    const file = path.join(MODELS_DIR, `${name}.json`)

    if (!fs.existsSync(file)) {
      const seed = defaultSeedFor(name, fields)
      fs.writeFileSync(file, JSON.stringify(seed, null, 2))
      created++
      console.log(`📝 Creado ${file}`)
    } else {
      try {
        const existing = JSON.parse(fs.readFileSync(file, 'utf-8'))
        const merged = mergeExistingWithSchema(existing, fields)
        fs.writeFileSync(file, JSON.stringify(merged, null, 2))
        updated++
        console.log(`🔄 Actualizado ${file}`)
      } catch (e) {
        console.warn(`⚠ No se pudo actualizar ${file}:`, e.message)
      }
    }
  }

  console.log(
    created || updated
      ? `✅ ensure-model-jsons: ${created} creado(s), ${updated} actualizado(s).`
      : 'ℹ ensure-model-jsons: nada que crear/actualizar.'
  )
}

run()
