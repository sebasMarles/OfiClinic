// lib/config-loader.ts
import fs from 'fs'
import path from 'path'
import type { TableConfig } from '@/types/table-config'
import type { ConfigCrudEntry } from '@/types/config-crud'
import patients from '@/config/models/patients.json'
import professionals from '@/config/models/professionals.json'
import services from '@/config/models/services.json'
import { prisma } from '@/lib/prisma'

const staticBySlug: Record<string, TableConfig> = {
  patient: patients as TableConfig,
  patients: patients as TableConfig,
  professional: professionals as TableConfig,
  professionals: professionals as TableConfig,
  services: services as TableConfig,
}

const CRUD_DIR = path.resolve(process.cwd(), 'config/crud')
const TABLES_FILE = path.join(CRUD_DIR, 'configTables.json')
const DETAIL_FILE = path.join(CRUD_DIR, 'configTableDetail.json')

function readCrudDetail(): Record<string, ConfigCrudEntry> {
  try { return JSON.parse(fs.readFileSync(DETAIL_FILE, 'utf-8')) } catch { return {} }
}

export async function getTableConfig(modelName: string): Promise<TableConfig | null> {
  const slug = (modelName || '').toLowerCase()

  // 1) ConfigCrud (detalles)
  const crud = readCrudDetail()
  const match = Object.values(crud).find(c => c.model.toLowerCase() === slug)
  if (match && match.status !== 'inactive') {
    // adapta ConfigCrudEntry → TableConfig
    return {
      model: match.model,
      title: match.title,
      description: match.description,
      columns: match.columns,                 // ColumnConfigExtended es compatible con ColumnConfig
      rowActions: match.rowActions,
      bulkActions: match.bulkActions,
      enableSelection: true,
      enableMultiSelection: true,
      enablePagination: true,
      pageSize: 20,
      enableSearch: true,
      enableFilters: true,
      enableExport: true,
    }
  }

  // 2) Config estático legacy
  if (staticBySlug[slug]) return staticBySlug[slug]

  // 3) (Opcional) Fallback temporal a collections del builder (mientras migras)
  const col = await prisma.collection.findUnique({
    where: { slug },
    include: { fields: { orderBy: { order: 'asc' } } },
  })
  if (col) {
    const columns = col.fields
      .sort((a: any, b: any) => a.order - b.order)
      .map((f: any) => ({
        key: f.key,
        title: f.title || f.key,
        type: f.type,
        sortable: true,
        filterable: !!f.filterable,
        hideable: !!f.hidden,
        ...(f.type === 'select' || f.type === 'badge' ? { options: f.options?.options ?? [] } : {}),
        required: !!f.required,
      }))
    return {
      model: col.slug,
      title: col.title ?? col.slug,
      description: col.description ?? undefined,
      columns,
      enableSelection: true, enableMultiSelection: true, enablePagination: true, pageSize: 20,
      enableSearch: true, enableFilters: true, enableExport: true,
    }
  }

  return null
}

export async function getAvailableModels(): Promise<string[]> {
  // ahora sale de ConfigCrud + estáticos + (opcional) builder legacy
  const crud = (() => { try { return JSON.parse(fs.readFileSync(TABLES_FILE, 'utf-8')) } catch { return { models: [] } } })()
  const fromCrud = (crud.models || []).map((m: any) => m.model)
  const dbSlugs = await prisma.collection.findMany({ select: { slug: true } })
  return [...new Set([...Object.keys(staticBySlug), ...fromCrud, ...dbSlugs.map(x => x.slug)])]
}
