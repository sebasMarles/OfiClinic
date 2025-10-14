// infrastructure/repositories/prisma-generic-repo.ts
import { prisma } from '@/lib/prisma'
import type { GenericRepository, ListParams } from '@/domain/validation/ports/generic-repository'
import { keyFor } from '@/infrastructure/dal' // usamos tu mapeo existente

type PrismaKey = keyof typeof prisma

export class PrismaGenericRepository implements GenericRepository {
  private readonly delegate: any
  private readonly key: PrismaKey

  constructor(private readonly slug: string) {
    // keyFor puede estar tipado como string en tu dal.ts -> forzamos el tipo esperado
    const key = keyFor(slug) as PrismaKey
    const d = (prisma as any)[key]
    if (!d) {
      throw new Error(
        `[PrismaGenericRepository] Delegate no encontrado para "${slug}" (key: "${String(key)}")`
      )
    }
    this.key = key
    this.delegate = d
  }

  async list(params: ListParams): Promise<{ items: any[]; total: number }> {
    const { where, orderBy, skip, take, select, include } = params || {}
    const [items, total] = await Promise.all([
      this.delegate.findMany({ where, orderBy, skip, take, select, include }),
      this.delegate.count({ where }),
    ])
    return { items, total }
  }

  async findById(id: string) {
    if (!id) return null
    return this.delegate.findUnique({ where: { id } })
  }

  async create(data: any) {
    return this.delegate.create({ data })
  }

  async update(id: string, data: any) {
    if (!id) throw new Error('[PrismaGenericRepository] update() sin id')
    return this.delegate.update({ where: { id }, data })
  }

  async delete(id: string) {
    if (!id) throw new Error('[PrismaGenericRepository] delete() sin id')
    await this.delegate.delete({ where: { id } })
  }

  async existsByField(field: string, value: any, excludeId?: string) {
    const where: any = { [field]: value }
    if (excludeId) where.NOT = { id: excludeId }
    const found = await this.delegate.findFirst({ where, select: { id: true } })
    return !!found
  }
}
