// lib/di.ts
import { PrismaGenericRepository } from '@/infrastructure/repositories/prisma-generic-repo'
import { PrismaDynamicRepository } from '@/infrastructure/repositories/prisma-dynamic-repo'
import { makeRecordUseCases } from '@/application/usecases/records'

/**
 * Devuelve los casos de uso para un slug (modelo) concreto.
 * Primero intentamos delegate nativo (Patient, Professional, ...),
 * si no existe, usamos el repo de colecciones dinámicas (DynamicRecord).
 */
export function getUseCasesFor(slug: string) {
  const s = (slug || '').toLowerCase()
  try {
    const repo = new PrismaGenericRepository(s)
    return makeRecordUseCases(repo, s)
  } catch {
    const repo = new PrismaDynamicRepository(s)
    return makeRecordUseCases(repo, s)
  }
}
