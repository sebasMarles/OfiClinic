// infrastructure/repositories/prisma-dynamic-repo.ts
import { prisma } from '@/lib/prisma'
import type { GenericRepository, ListParams } from '@/domain/validation/ports/generic-repository'

/**
 * Repositorio para colecciones dinámicas (Collection + DynamicRecord).
 * Usa el slug de la colección y guarda/lee el JSON en `DynamicRecord.data`.
 * Nota: En SQLite no hay filtros por ruta JSON, por lo que "search" y
 * ordenamiento por campos del JSON no se aplican aquí (usamos createdAt).
 */
export class PrismaDynamicRepository implements GenericRepository {
  constructor(private readonly collectionSlug: string) {}

  private async collectionOrThrow() {
    const c = await prisma.collection.findUnique({
      where: { slug: this.collectionSlug.toLowerCase() },
      select: { id: true },
    })
    if (!c) {
      throw new Error(`[PrismaDynamicRepository] No existe la colección "${this.collectionSlug}"`)
    }
    return c
  }

  async list(params: ListParams): Promise<{ items: any[]; total: number }> {
    const { skip = 0, take = 10 } = params || {}
    const col = await this.collectionOrThrow()
    const where = { collectionId: col.id }

    // Para dinámicas usamos orden fijo por fecha de creación (más nuevo primero)
    const [rows, total] = await Promise.all([
      prisma.dynamicRecord.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: { id: true, data: true, createdAt: true, updatedAt: true },
      }),
      prisma.dynamicRecord.count({ where }),
    ])

    // Aplanamos el JSON de `data` al objeto que espera la tabla
    const items = rows.map(r => ({
      id: r.id,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      ...(r.data as Record<string, any> | null ?? {}),
    }))

    return { items, total }
  }

  async findById(id: string) {
    if (!id) return null
    const r = await prisma.dynamicRecord.findUnique({
      where: { id },
      select: { id: true, data: true, createdAt: true, updatedAt: true },
    })
    if (!r) return null
    return {
      id: r.id,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      ...(r.data as Record<string, any> | null ?? {}),
    }
  }

  async create(data: any) {
    const col = await this.collectionOrThrow()
    const r = await prisma.dynamicRecord.create({
      data: { collectionId: col.id, data },
      select: { id: true, data: true, createdAt: true, updatedAt: true },
    })
    return {
      id: r.id,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      ...(r.data as Record<string, any> | null ?? {}),
    }
  }

  async update(id: string, data: any) {
    if (!id) throw new Error('[PrismaDynamicRepository] update() sin id')
    const r = await prisma.dynamicRecord.update({
      where: { id },
      data: { data },
      select: { id: true, data: true, createdAt: true, updatedAt: true },
    })
    return {
      id: r.id,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      ...(r.data as Record<string, any> | null ?? {}),
    }
  }

  async delete(id: string) {
    if (!id) throw new Error('[PrismaDynamicRepository] delete() sin id')
    await prisma.dynamicRecord.delete({ where: { id } })
  }

  /**
   * Chequeo de unicidad.
   * En SQLite no hay "JSON path equals", así que hacemos un scan acotado.
   * Para volúmenes grandes/mucho uso de únicos, conviene Postgres.
   */
  async existsByField(field: string, value: any, excludeId?: string) {
    const col = await this.collectionOrThrow()
    // Escaneo acotado (ajusta 'take' si lo necesitas)
    const sample = await prisma.dynamicRecord.findMany({
      where: { collectionId: col.id },
      select: { id: true, data: true },
      take: 1000,
    })
    return sample.some(r => {
      if (excludeId && r.id === excludeId) return false
      const d = (r.data as any) || {}
      return d[field] === value
    })
  }
}
