import { z } from 'zod'
import type { ColumnConfig, TableConfig } from '@/types/table-config'
import '@/lib/zod-locale'

/** Helpers de normalización */
const toUndefinedIfEmpty = (v: unknown) =>
  v === '' || v === null || typeof v === 'undefined' ? undefined : v

const toNumberOrNaN = (v: unknown) => {
  if (v === '' || v === null || typeof v === 'undefined') return undefined
  if (typeof v === 'number') return v
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN
}

const toBooleanOrUndefined = (v: unknown) => {
  if (v === '' || v === null || typeof v === 'undefined') return undefined
  if (typeof v === 'boolean') return v
  if (v === 'true') return true
  if (v === 'false') return false
  return undefined
}

const toDateOrInvalid = (v: unknown): Date | undefined => {
  if (v === '' || v === null || typeof v === 'undefined') return undefined
  if (v instanceof Date) return v
  const d = new Date(String(v))
  return isNaN(d.getTime()) ? undefined : d
}

/** Heurísticas por clave común si el JSON no trae "validation" */
function defaultStringPatternFor(col: ColumnConfig): { re: RegExp; message: string } | null {
  const k = col.key.toLowerCase()
  // Teléfonos: 7-15 dígitos
  if (/(^phone$|^telefono$|^tel$)/.test(k)) {
    return { re: /^\d{7,15}$/, message: `${col.title} debe contener solo dígitos (7–15)` }
  }
  // Documento: 5-20 dígitos
  if (/document/.test(k)) {
    return { re: /^\d{5,20}$/, message: `${col.title} debe contener solo dígitos (5–20)` }
  }
  return null
}

/** Email robusto (simple y usable) */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function zodFromColumn(col: ColumnConfig): z.ZodTypeAny {
  const v = col.validation || {}
  const req = v.required ?? col.required ?? false

  switch (col.type) {
    case 'text': {
      // string (o undefined si vacío)
      let s: z.ZodTypeAny = z.preprocess(toUndefinedIfEmpty, z.string())

      // min/max length si existen
      if (typeof v.minLength === 'number') {
        s = s.refine(
          (val: unknown) => {
            const str = (val ?? '') as string
            return str.length >= v.minLength!
          },
          `${col.title} mínimo ${v.minLength} caracteres`,
        )
      }
      if (typeof v.maxLength === 'number') {
        s = s.refine(
          (val: unknown) => {
            const str = (val ?? '') as string
            return str.length <= v.maxLength!
          },
          `${col.title} máximo ${v.maxLength} caracteres`,
        )
      }

      // pattern explícito en JSON o heurística por clave
      const pat =
        (typeof v.pattern === 'string' && v.pattern.trim()
          ? { re: new RegExp(v.pattern), message: `${col.title} con formato inválido` }
          : defaultStringPatternFor(col))

      if (pat) {
        s = s.refine(
          (val: unknown) => {
            const str = (val ?? '') as string
            // Si no es requerido y viene undefined, pasa; si viene string debe coincidir
            return str === '' ? !req : pat.re.test(str)
          },
          pat.message,
        )
      }

      return req ? s : s.optional()
    }

    case 'email': {
      // Permitimos undefined si no es requerido, y validamos formato cuando hay valor
      let s: z.ZodTypeAny = z.preprocess(toUndefinedIfEmpty, z.string())
      s = s.refine(
        (val: unknown) => {
          const str = (val ?? '') as string
          if (!str) return !req // vacío: solo pasa si NO es requerido
          return EMAIL_RE.test(str)
        },
        `${col.title} no es un email válido`,
      )
      return req ? s : s.optional()
    }

    case 'number':
    case 'currency': {
      // Normalizamos a número o undefined
      let s: z.ZodTypeAny = z.preprocess(toNumberOrNaN, z.number())

      // Si no es requerido, permitimos undefined (el errorMap global maneja "requerido")
      if (!req) s = s.optional()

      if (typeof v.min === 'number') {
        s = s.refine(
          (val: unknown) => {
            const n = val as number | undefined
            return n === undefined || n >= v.min!
          },
          `${col.title} mínimo ${v.min}`,
        )
      }
      if (typeof v.max === 'number') {
        s = s.refine(
          (val: unknown) => {
            const n = val as number | undefined
            return n === undefined || n <= v.max!
          },
          `${col.title} máximo ${v.max}`,
        )
      }
      return s
    }

    case 'boolean': {
      let s: z.ZodTypeAny = z.preprocess(toBooleanOrUndefined, z.boolean())
      return req ? s : s.optional()
    }

    case 'date': {
      // Acepta undefined si no requerido; valida Date si hay valor
      let s: z.ZodTypeAny = z
        .preprocess(toDateOrInvalid, z.any())
        .refine(
          (val: unknown) => {
            const d = val as Date | undefined
            return req ? d instanceof Date : d === undefined || d instanceof Date
          },
          `${col.title} no es una fecha válida`,
        )

      // No permitir fechas futuras si se indica en JSON (validation.maxDateToday: true)
      if (v.maxDateToday) {
        s = s.refine(
          (val: unknown) => {
            const d = val as Date | undefined
            return d === undefined || d <= new Date()
          },
          `${col.title} no puede ser futura`,
        )
      }
      return req ? s : s.optional()
    }

    case 'select':
    case 'badge': {
      const opts = col.options ?? []
      let s: z.ZodTypeAny = z
        .preprocess(toUndefinedIfEmpty, z.string())
        .refine(
          (val: unknown) => {
            const str = (val ?? '') as string
            if (!str) return !req // vacío: solo pasa si no es requerido
            return opts.includes(str)
          },
          `${col.title} opción inválida`,
        )
      return req ? s : s.optional()
    }

    default:
      // Por si aparece un tipo no contemplado
      return req ? z.any() : z.any().optional()
  }
}

export function schemaFromConfig(config: TableConfig) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const col of config.columns) {
    if (['id', 'createdAt', 'updatedAt'].includes(col.key)) continue
    shape[col.key] = zodFromColumn(col)
  }
  return z.object(shape)
}
