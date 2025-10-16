// prisma/scripts/generate-configs.mjs
import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'

const ROOT = process.cwd()
const SCHEMA = path.resolve(ROOT, 'prisma/schema.prisma')
const OUT_DIR = path.resolve(ROOT, 'config/crud')
const OUT_TABLES = path.join(OUT_DIR, 'crudTable.json')
// 👇 tu ensure está en LA MISMA CARPETA prisma/scripts
const ENSURE_SCRIPT = path.resolve(ROOT, 'prisma/scripts/ensure-model-jsons.mjs')

// Tipos escalares de Prisma
const PRISMA_SCALARS = new Set([
  'String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes'
])

// Modelos y campos a ignorar por defecto
const IGNORE_MODELS = new Set(['Collection', 'Field', 'DynamicRecord', 'PrismaMigration'])
const EXCLUDE_FIELDS = new Set(['id', 'createdAt', 'updatedAt'])

// ---- utils ----
function readSchema() {
  if (!fs.existsSync(SCHEMA)) {
    console.error('❌ No se encontró prisma/schema.prisma')
    process.exit(1)
  }
  return fs.readFileSync(SCHEMA, 'utf-8')
}

function allModels(schemaText) {
  const out = []
  const re = /(^|\n)\s*model\s+(\w+)\s*\{([\s\S]*?)\}/g
  let m
  while ((m = re.exec(schemaText)) !== null) {
    out.push({ name: m[2], blockText: m[3], idx: m.index })
  }
  return out
}

function hasCrudDocBefore(schemaText, modelIdx) {
  // mira unas líneas antes del bloque model para encontrar "/// @crud"
  const windowStart = Math.max(0, modelIdx - 600)
  const win = schemaText.slice(windowStart, modelIdx)
  return /\/\/\/\s*@crud(?:\(|\s|$)/i.test(win)
}

function discoverCrudModels(schemaText) {
  const models = allModels(schemaText)

  // 1) por marca @crud o nombre que empiece con Crud
  let selected = models.filter(m =>
    hasCrudDocBefore(schemaText, m.idx) || /^Crud/i.test(m.name)
  )

  // 2) fallback: si no hay ninguno, tomar todos excepto los “sistémicos”
  if (selected.length === 0) {
    selected = models.filter(m => !IGNORE_MODELS.has(m.name))
  }

  return selected
}

function parseFields(blockText) {
  // Devuelve [{ name, typeClean, isOptional, isList, isScalar, isRelation }]
  return blockText
    .split('\n')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('//') && !s.startsWith('@@'))
    .map(line => {
      const [name, typeRaw] = line.split(/\s+/)
      if (!name || !typeRaw) return null
      const isOptional = /\?$/.test(typeRaw)
      const isList = /\[\]/.test(typeRaw)
      const typeClean = typeRaw.replace(/\?|\[\]/g, '')
      const isScalar = PRISMA_SCALARS.has(typeClean)
      return { name, typeClean, isOptional, isList, isScalar }
    })
    .filter(Boolean)
}

function mapPrismaToCrudType(typeClean, isScalar) {
  if (!isScalar) return 'String' // relaciones → String (según tu ejemplo)
  if (['Int','BigInt','Float','Decimal'].includes(typeClean)) return 'Number'
  // String, Boolean, DateTime, Json, Bytes → como están (salvo Json/Bytes, que no has mostrado; los dejamos como String)
  if (typeClean === 'Json' || typeClean === 'Bytes') return 'String'
  return typeClean // "String" | "Boolean" | "DateTime"
}

function buildCrudTable(modelsParsed) {
  const out = { models: [] }

  for (const m of modelsParsed) {
    const fields = parseFields(m.blockText)
      .filter(f => !EXCLUDE_FIELDS.has(f.name))
      .map(f => ({
        key: f.name,
        type: mapPrismaToCrudType(f.typeClean, f.isScalar),
        required: !f.isOptional // listas no llevan "?" → quedarán true (coincide con tu ejemplo)
      }))

    out.models.push({ name: m.name, fields })
  }

  return out
}

function main() {
  const schema = readSchema()
  const discovered = discoverCrudModels(schema) // { name, blockText }[]

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  const crudTable = buildCrudTable(discovered)
  fs.writeFileSync(OUT_TABLES, JSON.stringify(crudTable, null, 2))
  console.log(`✅ Generado ${OUT_TABLES} con ${crudTable.models.length} modelo(s).`)

  // NO creamos configTableDetail.json

  // Llamar al ensure que vive en prisma/scripts
  if (fs.existsSync(ENSURE_SCRIPT)) {
    console.log('▶ Ejecutando prisma/scripts/ensure-model-jsons.mjs …')
    const res = spawnSync('node', [ENSURE_SCRIPT], { stdio: 'inherit', env: process.env })
    if (res.status !== 0) {
      console.warn('⚠ ensure-model-jsons.mjs terminó con código', res.status)
    } else {
      console.log('✅ ensure-model-jsons.mjs finalizado.')
    }
  } else {
    console.log('ℹ No se encontró prisma/scripts/ensure-model-jsons.mjs (saltado).')
  }
}

main()
