// prisma/scripts/generate-configs.mjs
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const SCHEMA = path.resolve(ROOT, 'prisma/schema.prisma')
const OUT_DIR = path.resolve(ROOT, 'config/crud')
const OUT_FILE = path.join(OUT_DIR, 'crudTable.json')

// Tipos escalares que mapearemos a String/Number/Boolean/DateTime
const SCALARS = new Set(['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes'])

// Campos/metas a ignorar
const EXCLUDE_FIELDS = new Set(['id', 'createdAt', 'updatedAt'])

// --- helpers mínimos ---
function readSchema() {
  if (!fs.existsSync(SCHEMA)) {
    console.error('❌ No se encontró prisma/schema.prisma')
    process.exit(1)
  }
  return fs.readFileSync(SCHEMA, 'utf-8')
}

function* iterModels(schemaText) {
  const re = /(^|\n)\s*model\s+(\w+)\s*\{([\s\S]*?)\}/g
  let m
  while ((m = re.exec(schemaText)) !== null) {
    yield { name: m[2], block: m[3], startIdx: m.index }
  }
}

function hasCrudMarkerBefore(schemaText, startIdx) {
  // Busca “/// @crud” hasta ~600 chars antes del bloque
  const win = schemaText.slice(Math.max(0, startIdx - 600), startIdx)
  return /\/\/\/\s*@crud(?:\(|\s|$)/i.test(win)
}

function discoverCrudModels(schemaText) {
  const out = []
  for (const mdl of iterModels(schemaText)) {
    const marked = hasCrudMarkerBefore(schemaText, mdl.startIdx)
    const prefixed = /^Crud/i.test(mdl.name)
    if (marked || prefixed) out.push(mdl)
  }
  return out
}

function parseFields(block) {
  // Devuelve [{ name, typeClean, isOptional, isScalar }]
  return block
    .split('\n')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('//') && !s.startsWith('@@'))
    .map(line => {
      const [name, typeRaw] = line.split(/\s+/)
      if (!name || !typeRaw) return null
      const isOptional = /\?$/.test(typeRaw)
      const typeClean = typeRaw.replace(/\?|\[\]/g, '')
      const isScalar = SCALARS.has(typeClean)
      return { name, typeClean, isOptional, isScalar }
    })
    .filter(Boolean)
}

function mapType(typeClean, isScalar) {
  if (!isScalar) return 'String' // relaciones → String (según tu criterio/ejemplo)
  if (['Int', 'BigInt', 'Float', 'Decimal'].includes(typeClean)) return 'Number'
  if (typeClean === 'Json' || typeClean === 'Bytes') return 'String'
  return typeClean // "String" | "Boolean" | "DateTime"
}

function buildCrudTable(models) {
  const result = { models: [] }
  for (const m of models) {
    const fields = parseFields(m.block)
      .filter(f => !EXCLUDE_FIELDS.has(f.name))
      .map(f => ({
        key: f.name,
        type: mapType(f.typeClean, f.isScalar),
        required: !f.isOptional
      }))
    result.models.push({ name: m.name, fields })
  }
  return result
}

function main() {
  const schema = readSchema()
  const crudModels = discoverCrudModels(schema) // solo @crud o prefijo "Crud"
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  const payload = buildCrudTable(crudModels)
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2))
  console.log(`✅ Generado ${OUT_FILE} con ${payload.models.length} modelo(s).`)
  // Nota: no llamamos a ningún otro script aquí. Este paso es solo para crudTable.json.
}

main()
