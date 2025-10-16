// prisma/scripts/generate-configs.mjs
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const SCHEMA = path.resolve(ROOT, 'prisma/schema.prisma')
const MODELS_DIR = path.resolve(ROOT, 'config/models')
const OUT_DIR = path.resolve(ROOT, 'config/crud')
const OUT_TABLES = path.join(OUT_DIR, 'configTables.json')
const OUT_DETAIL = path.join(OUT_DIR, 'configTableDetail.json')

// Cambia a true si también quieres purgar detalles de modelos inexistentes
const PRUNE_DETAIL = false

// --- helpers ---
function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')) } catch { return fallback }
}
function saveJson(file, data) {
  if (!fs.existsSync(path.dirname(file))) fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}
function readAllModelJsons() {
  if (!fs.existsSync(MODELS_DIR)) return []
  const files = fs.readdirSync(MODELS_DIR).filter(f => f.endsWith('.json'))
  const out = []
  for (const f of files) {
    try {
      const obj = JSON.parse(fs.readFileSync(path.join(MODELS_DIR, f), 'utf-8'))
      if (obj?.model) out.push(obj)
    } catch {}
  }
  return out
}
function toTitle(s) {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function parseKeyValueList(str) {
  // muy simple: "status: parametrized, foo: bar"
  const out = {}
  for (const pair of String(str || '').split(',')) {
    const [k, v] = pair.split(':').map(s => s?.trim())
    if (!k) continue
    if (v) out[k] = v.replace(/^['"]|['"]$/g, '')
  }
  return out
}

// --- descubrimiento de modelos y meta desde schema ---
// Detecta: (1) modelos con "/// @crud(...)" encima, (2) modelos prefijo "Crud"
function discoverCrudModels(schemaText) {
  const models = []
  const lines = schemaText.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith('model ')) {
      const m = /^model\s+(\w+)\s*\{/.exec(line)
      if (!m) continue
      const modelName = m[1]

      // mira 5 líneas hacia arriba por anotación @crud
      const window = lines.slice(Math.max(0, i - 5), i).join('\n')
      const crudLine = /\/\/\/\s*@crud(?:\(([^)]*)\))?/i.exec(window)
      const hasCrudDoc = !!crudLine
      const hasPrefix = /^Crud/i.test(modelName)
      if (hasCrudDoc || hasPrefix) {
        const meta = crudLine?.[1] ? parseKeyValueList(crudLine[1]) : {}
        models.push({ name: modelName, meta })
      }
    }
  }
  return models
}

// --- parseo básico de campos de un modelo ---
function parseModelFields(schemaText, model) {
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

// --- heurística de columnas ---
function toColumnConfig(field) {
  const k = field.name
  const t = field.type.replace('?', '')
  const base = { key: k, title: toTitle(k), sortable: true, filterable: true, type: 'text' }
  if (['Int','BigInt','Float','Decimal'].includes(t)) return { ...base, type: 'number' }
  if (t === 'Boolean') return { ...base, type: 'boolean' }
  if (t === 'DateTime') return { ...base, type: 'date' }
  if (/Email/i.test(k)) return { ...base, type: 'email' }
  return base
}

function main() {
  const schema = fs.readFileSync(SCHEMA, 'utf-8')
  const discovered = discoverCrudModels(schema) // [{ name, meta: { status? } }]
  const presentSet = new Set(discovered.map(d => d.name))

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  // lee modelos JSON (config/models/*.json) → status/title/etc
  const modelJsons = readAllModelJsons()
  const jsonByModel = new Map(modelJsons.map(j => [String(j.model), j]))

  // --- OUT_TABLES (índice): PRIMERO, PURGAR lo que ya no exista en el schema ---
  const tables = loadJson(OUT_TABLES, { models: [] })
  const before = tables.models.length
  const removed = tables.models.filter(m => !presentSet.has(m.model)).map(m => m.model)
  if (removed.length > 0) {
    console.log(`🧹 Quitando del índice (configTables.json): ${removed.join(', ')}`)
  }
  tables.models = tables.models.filter(m => presentSet.has(m.model))

  // reindex después de purgar
  const indexByModel = new Map(tables.models.map((m, i) => [m.model, i]))

  // Ahora añadimos/actualizamos los modelos descubiertos
  for (const { name, meta } of discovered) {
    const fromJson = jsonByModel.get(name) || {}
    const desiredStatus =
      (meta?.status && ['parametrized','inactive','unset'].includes(meta.status) ? meta.status :
      (typeof fromJson.status === 'string' && ['parametrized','inactive','unset'].includes(fromJson.status) ? fromJson.status :
      undefined)) || 'unset'

    if (indexByModel.has(name)) {
      // actualiza status y (opcional) title si viene del json
      const idx = indexByModel.get(name)
      tables.models[idx].status = desiredStatus
      if (fromJson?.title) tables.models[idx].title = fromJson.title
    } else {
      tables.models.push({
        model: name,
        title: fromJson?.title || name,
        status: desiredStatus,
      })
      indexByModel.set(name, tables.models.length - 1)
    }
  }
  saveJson(OUT_TABLES, tables)

  // --- OUT_DETAIL (detalle por modelo): opcionalmente purgar también ---
  const detail = loadJson(OUT_DETAIL, {})
  if (PRUNE_DETAIL) {
    let pruned = 0
    for (const key of Object.keys(detail)) {
      if (!presentSet.has(key)) { delete detail[key]; pruned++ }
    }
    if (pruned > 0) console.log(`🧹 Quitando ${pruned} modelos del detalle (configTableDetail.json) al no existir en schema.`)
  }

  // sincroniza/crea detalle (solo status si ya existe)
  for (const { name, meta } of discovered) {
    const fromJson = jsonByModel.get(name) || {}
    const desiredStatus =
      (meta?.status && ['parametrized','inactive','unset'].includes(meta.status) ? meta.status :
      (typeof fromJson.status === 'string' && ['parametrized','inactive','unset'].includes(fromJson.status) ? fromJson.status :
      undefined)) || 'unset'

    if (!detail[name]) {
      const fields = parseModelFields(schema, name)
      const columnsHeur = fields
        .filter(f => !['id','createdAt','updatedAt'].includes(f.name))
        .map(toColumnConfig)

      detail[name] = {
        model: name,
        title: fromJson?.title || name,
        description: fromJson?.description || undefined,
        status: desiredStatus,
        columns: Array.isArray(fromJson?.columns) && fromJson.columns.length > 0 ? fromJson.columns : columnsHeur,
        rowActions: Array.isArray(fromJson?.rowActions) ? fromJson.rowActions : [
          { id: 'edit', label: 'Editar', icon: 'pencil', variant: 'ghost', action: 'edit' },
        ],
        bulkActions: Array.isArray(fromJson?.bulkActions) ? fromJson.bulkActions : [
          { id: 'export', label: 'Exportar CSV', icon: 'download', variant: 'outline', action: 'export' },
        ],
        relations: Array.isArray(fromJson?.relations) ? fromJson.relations : undefined,
        containerId: fromJson?.containerId || undefined,
      }
    } else {
      // ya existe → NO piso config; solo sincronizo el status
      detail[name].status = desiredStatus
    }
  }
  saveJson(OUT_DETAIL, detail)

  const after = tables.models.length
  const added = discovered.length - (before - removed.length)
  console.log(`✅ ConfigCrud actualizado. Modelos en índice: ${after} ${removed.length ? `(eliminados: ${removed.length})` : ''}`)
}

main()
