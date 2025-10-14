// application/usecases/records.ts
import type { GenericRepository, ListParams } from '@/domain/validation/ports/generic-repository'
import type { TableConfig } from '@/types/table-config'
import { getTableConfig } from '@/lib/config-loader'

/**
 * Construye el "where" de búsqueda a partir del JSON de la tabla (campos filterable).
 * Evitamos 'mode: insensitive' para compatibilidad con SQLite.
 */
function buildSearchWhere(cfg: TableConfig | null, search: string) {
  if (!cfg || !search) return undefined

  const filterable = cfg.columns.filter(c => c.filterable).map(c => ({ key: c.key, type: c.type }))
  if (filterable.length === 0) return undefined

  const or: any[] = []
  const n = Number(search)
  const isNumeric = Number.isFinite(n)

  for (const f of filterable) {
    // si el campo es numérico, permitimos buscar por igualdad
    if (isNumeric && (f.type === 'number' || f.type === 'currency')) {
      or.push({ [f.key]: n })
    } else {
      or.push({ [f.key]: { contains: search } })
    }
  }

  if (or.length === 0) return undefined
  return { OR: or }
}

/**
 * Ordenación segura
 */
function buildOrderBy(cfg: TableConfig | null, sortBy?: string, sortOrder?: 'asc' | 'desc') {
  const field = sortBy && cfg?.columns.some(c => c.key === sortBy) ? sortBy : 'createdAt'
  const dir: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc'
  return { [field]: dir }
}

export function makeRecordUseCases(repo: GenericRepository, slug: string) {
  return {
    async list(params: {
      page?: number
      pageSize?: number
      search?: string
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
    }) {
      const { page = 1, pageSize = 20, search = '', sortBy, sortOrder } = params
      const cfg = await getTableConfig(slug)

      const where = buildSearchWhere(cfg, search)
      const orderBy = buildOrderBy(cfg, sortBy, sortOrder)
      const skip = (page - 1) * pageSize
      const take = pageSize

      const { items, total } = await repo.list({ where, orderBy, skip, take } as ListParams)
      return { data: items, total, page, pageSize }
    },

    async get(id: string) {
      return repo.findById(id)
    },

    async create(data: any) {
      return repo.create(data)
    },

    async update(id: string, data: any) {
      return repo.update(id, data)
    },

    async remove(id: string) {
      await repo.delete(id)
      return { id, deleted: true }
    },

    async existsByField(field: string, value: any, excludeId?: string) {
      return repo.existsByField(field, value, excludeId)
    },
  }
}
