// lib/config-loader.ts
import type { TableConfig, ColumnConfig } from '@/types/table-config'
import patients from '@/config/models/patients.json'
import professionals from '@/config/models/professionals.json'
import { prisma } from '@/lib/prisma'

// Mapa estático por slug y también por plural
const staticBySlug: Record<string, TableConfig> = {
  patient: patients as TableConfig,
  patients: patients as TableConfig,
  professional: professionals as TableConfig,
  professionals: professionals as TableConfig,
}

// Convierte una "Collection" de DB (si estás usando el builder) a TableConfig
function collectionToTableConfig(col: any): TableConfig {
  const columns: ColumnConfig[] = col.fields
    .sort((a: any, b: any) => a.order - b.order)
    .map((f: any) => {
      const base: ColumnConfig = {
        key: f.key,
        title: f.title || f.key,
        type: f.type as ColumnConfig['type'],
        sortable: true,
        filterable: !!f.filterable,
        hideable: !!f.hidden,
      }
      if (f.type === 'select' || f.type === 'badge') {
        base.options = f.options?.options ?? []
      }
      // Si marcaste “requerido” en el builder, guárdalo para validación
      ;(base as any).required = !!f.required
      return base
    })

  return {
    model: col.slug, // usamos slug como identificador
    title: col.title ?? col.slug,
    description: col.description ?? undefined,
    columns,
    enableSelection: true,
    enableMultiSelection: true,
    enablePagination: true,
    pageSize: 20,
    enableSearch: true,
    enableFilters: true,
    enableExport: true,
  }
}

export async function getTableConfig(modelName: string): Promise<TableConfig | null> {
  const slug = (modelName || '').toLowerCase()

  // 1) Intenta estático
  if (staticBySlug[slug]) return staticBySlug[slug]

  // 2) Intenta colección dinámica en DB (builder)
  const col = await prisma.collection.findUnique({
    where: { slug },
    include: { fields: { orderBy: { order: 'asc' } } },
  })
  if (col) return collectionToTableConfig(col)

  return null
}

export async function getAvailableModels(): Promise<string[]> {
  const dbSlugs = await prisma.collection.findMany({ select: { slug: true } })
  return [
    ...new Set([
      ...Object.keys(staticBySlug),
      ...dbSlugs.map(x => x.slug),
    ]),
  ]
}
