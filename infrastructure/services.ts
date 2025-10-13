// infrastructure/services.ts
import * as dal from './dal'

type SortOrder = 'asc' | 'desc'

export async function listRecords(
  model: string,
  params: {
    page?: number
    pageSize?: number
    search?: string
    sortBy?: string
    sortOrder?: SortOrder
  },
) {
  const { page = 1, pageSize = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = params

  const where = buildWhere(model, search)

  const total = await dal.count(model, where)
  const data = await dal.findMany(model, {
    where,
    orderBy: { [sortBy]: sortOrder },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
}

export async function getRecord(model: string, id: string) {
  return dal.findUnique(model, id)
}

export async function createRecord(model: string, data: any) {
  return dal.create(model, data)
}

export async function updateRecord(model: string, id: string, data: any) {
  return dal.update(model, id, data)
}

export async function deleteRecord(model: string, id: string) {
  return dal.remove(model, id)
}

/**
 * Verifica si existe un registro donde `field == value`.
 * Si `excludeId` está presente, lo excluye (útil para PUT).
 */
export async function existsByField(model: string, field: string, value: any, excludeId?: string) {
  const where: any = { [field]: value }
  if (excludeId) where.id = { not: excludeId }
  const count = await dal.count(model, where)
  return count > 0
}

/** where básico por modelo para el buscador libre */
function buildWhere(model: string, search: string) {
  const q = (search || '').trim()
  if (!q) return {}

  const contains = (k: string) => ({ [k]: { contains: q } })

  switch (model.toLowerCase()) {
    case 'patient':
      return {
        OR: [
          contains('firstName'),
          contains('lastName'),
          contains('email'),
          contains('documentNumber'),
          contains('phone'),
        ],
      }
    case 'professional':
      return {
        OR: [
          contains('fullName'),
          contains('email'),
          contains('phone'),
          contains('specialty'),
        ],
      }
    default:
      // genérico
      return {
        OR: [
          contains('name'),
          contains('title'),
          contains('email'),
          contains('description'),
        ],
      }
  }
}
