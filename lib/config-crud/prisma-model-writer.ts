// lib/config-crud/prisma-model-writer.ts
import fs from 'fs/promises'
import path from 'path'
import type { ConfigCrudEntry } from '@/types/config-crud'
import type { ColumnConfig } from '@/types/table-config'
import { paths } from './fs'

function prismaScalarFromColumn(col: ColumnConfig): string {
  switch (col.type) {
    case 'number': return 'Int'
    case 'currency': return 'Decimal'
    case 'boolean': return 'Boolean'
    case 'date': return 'DateTime'
    case 'email':
    case 'select':
    case 'badge':
    case 'text':
    default:
      return 'String'
  }
}

function isRequired(col: ColumnConfig): boolean {
  return Boolean((col as any).required ?? col.validation?.required)
}

function buildManagedFieldLine(col: ColumnConfig, existingRaw?: string): string {
  const scalar = prismaScalarFromColumn(col)
  const required = isRequired(col)
  // atributos existentes (preserva @default(...) u otros), pero controla @unique según JSON
  const existingTokens = (existingRaw || '')
    .split(/\s+/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(tok => !/^@unique$/.test(tok)) // lo reponemos según col.unique

  const attrs: string[] = []
  if (col.unique) attrs.push('@unique')
  // añade los preservados (excepto @unique que ya tratamos)
  for (const tok of existingTokens) {
    if (!attrs.includes(tok)) attrs.push(tok)
  }

  const typePart = required ? scalar : `${scalar}?`
  const attrsPart = attrs.length ? ' ' + attrs.join(' ') : ''
  return `${col.key} ${typePart}${attrsPart}`
}

function extractModelBlock(schema: string, model: string) {
  const re = new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\}`, 'm')
  const m = re.exec(schema)
  if (!m) return null
  return { full: m[0], body: m[1], start: m.index, end: m.index + m[0].length }
}

function parseBodyLines(body: string) {
  // Retorna mapa name -> { line, name, type, raw }
  const lines = body.split('\n')
  const map = new Map<string, { line:string; name:string; type?:string; raw?:string }>()
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    if (line.startsWith('//') || line.startsWith('@@')) continue
    // asume "name type @attrs..."
    const parts = line.split(/\s+/)
    if (parts.length < 2) continue
    const [name, type, ...rest] = parts
    map.set(name, { line, name, type, raw: rest.join(' ') })
  }
  return map
}

function composeModelBlock(model: string, lines: string[]): string {
  const tab = '  '
  const body = lines.map(l => (l ? tab + l : '')).join('\n')
  return `model ${model} {\n${body}\n}`
}

export async function upsertPrismaModelFromConfig(conf: ConfigCrudEntry): Promise<{ wrote: boolean; warnings: string[] }> {
  const SCHEMA = paths.SCHEMA
  const warnings: string[] = []

  let schema = await fs.readFile(SCHEMA, 'utf-8').catch(()=>'')
  if (!schema) {
    throw new Error('schema_not_found')
  }

  const modelName = conf.model
  if (!modelName) throw new Error('invalid_model_name')

  // 1) construye líneas gestionadas desde JSON
  const managedColumns = conf.columns || []

  // 2) busca bloque existente
  const block = extractModelBlock(schema, modelName)
  let existingMap = new Map<string, { line:string; name:string; type?:string; raw?:string }>()
  if (block) {
    existingMap = parseBodyLines(block.body)
  }

  // 3) líneas fijas (asegurar id/createdAt/updatedAt)
  const idLine = existingMap.get('id')?.line || `id String @id @default(cuid())`
  const createdLine = existingMap.get('createdAt')?.line || `createdAt DateTime @default(now())`
  const updatedLine = existingMap.get('updatedAt')?.line || `updatedAt DateTime @updatedAt`

  // 4) compón líneas gestionadas por JSON (preservando @default(...) existentes)
  const managedLines: string[] = []
  managedLines.push(idLine)

  for (const col of managedColumns) {
    if (['id','createdAt','updatedAt'].includes(col.key)) continue
    const prev = existingMap.get(col.key)
    managedLines.push(buildManagedFieldLine(col, prev?.raw))
  }

  managedLines.push(createdLine)
  managedLines.push(updatedLine)

  // 5) preserva líneas no gestionadas (relaciones u otros no presentes en JSON)
  const managedKeys = new Set(['id','createdAt','updatedAt', ...managedColumns.map(c => c.key)])
  const preserved: string[] = []
  for (const [name, item] of existingMap.entries()) {
    if (!managedKeys.has(name)) {
      preserved.push(item.line)
    }
  }

  const composed = composeModelBlock(modelName, [...managedLines, ...preserved])

  // 6) reemplaza o inserta bloque en schema
  if (block) {
    schema = schema.slice(0, block.start) + composed + schema.slice(block.end)
  } else {
    // inserta al final con dos saltos
    schema = schema.trimEnd() + '\n\n' + composed + '\n'
  }

  await fs.writeFile(SCHEMA, schema, 'utf-8')
  return { wrote: true, warnings }
}
