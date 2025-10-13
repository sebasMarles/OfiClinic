// infrastructure/dal.ts
import { prisma } from '@/lib/prisma'

/**
 * Modelos soportados en Prisma (slugs en minúsculas).
 */
export type ModelName =
  | 'patient'
  | 'professional'
  | 'clinicalhistory'
  | 'appointment'
  | 'collection'
  | 'collectionfield'

const validModels: ModelName[] = [
  'patient',
  'professional',
  'clinicalhistory',
  'appointment',
  'collection',
  'collectionfield',
]

export function isValidModel(model: string): model is ModelName {
  return validModels.includes(model as ModelName)
}

/**
 * Mapea el slug al delegate real de Prisma (nombre de propiedad en `prisma`).
 * - Soporta plurales comunes.
 * - clinicalhistory → clinicalHistory
 * - collectionfield / fields → collectionField
 *
 * Nota: devolvemos `string` para evitar choques con el tipado de Prisma,
 * ya que luego accedemos como `(prisma as any)[key]`.
 */
export function keyFor(model: string): string {
  const m = (model || '').toLowerCase()

  if (m === 'patients') return 'patient'
  if (m === 'professionals') return 'professional'
  if (m === 'clinicalhistory' || m === 'clinicalhistories') return 'clinicalHistory'
  if (m === 'appointments') return 'appointment'
  if (m === 'collections') return 'collection'
  if (m === 'collectionfield' || m === 'collectionfields' || m === 'fields') return 'collectionField'

  // por defecto, intenta el mismo nombre (patient, professional, collection, collectionField, appointment)
  return m
}

/** Helper para obtener delegate con guardas */
function repoOf(model: ModelName | string) {
  const key = keyFor(model as string)
  const repo = (prisma as any)[key]
  if (!repo) {
    console.error(`[DAL] delegate no encontrado para modelo "${model}" (key "${String(key)}")`)
  }
  return repo
}

/** Lista */
export async function findMany(
  model: ModelName | string,
  params: {
    skip?: number
    take?: number
    where?: any
    orderBy?: any
    select?: any
    include?: any
  },
) {
  const repo = repoOf(model)
  if (!repo) return []
  return repo.findMany(params)
}

/** Total */
export async function count(model: ModelName | string, where?: any) {
  const repo = repoOf(model)
  if (!repo) return 0
  return repo.count({ where })
}

/** Por id (único) */
export async function findUnique(model: ModelName | string, id?: string) {
  if (!id) {
    throw new Error(`[DAL] findUnique() llamado sin id para modelo "${model}"`)
  }
  const repo = repoOf(model)
  if (!repo) throw new Error(`[DAL] findUnique(): delegate no encontrado para "${model}"`)
  return repo.findUnique({ where: { id } })
}

/** Crear */
export async function create(model: ModelName | string, data: any) {
  const repo = repoOf(model)
  if (!repo) throw new Error(`[DAL] create(): delegate no encontrado para "${model}"`)
  return repo.create({ data })
}

/** Actualizar */
export async function update(model: ModelName | string, id: string, data: any) {
  if (!id) throw new Error(`[DAL] update() llamado sin id para modelo "${model}"`)
  const repo = repoOf(model)
  if (!repo) throw new Error(`[DAL] update(): delegate no encontrado para "${model}"`)
  return repo.update({ where: { id }, data })
}

/** Eliminar */
export async function remove(model: ModelName | string, id: string) {
  if (!id) throw new Error(`[DAL] remove() llamado sin id para modelo "${model}"`)
  const repo = repoOf(model)
  if (!repo) throw new Error(`[DAL] remove(): delegate no encontrado para "${model}"`)
  return repo.delete({ where: { id } })
}

/** Eliminar en lote */
export async function bulkDelete(model: ModelName | string, ids: string[]) {
  const repo = repoOf(model)
  if (!repo) throw new Error(`[DAL] bulkDelete(): delegate no encontrado para "${model}"`)
  return repo.deleteMany({ where: { id: { in: ids } } })
}

/** Existe un registro con field=value (excluyendo opcionalmente id) */
export async function existsByField(model: ModelName | string, field: string, value: any, excludeId?: string) {
  const repo = repoOf(model)
  if (!repo) throw new Error(`[DAL] existsByField(): delegate no encontrado para "${model}"`)
  const where: any = { [field]: value }
  if (excludeId) where.NOT = { id: excludeId }
  const found = await repo.findFirst({ where, select: { id: true } })
  return !!found
}
