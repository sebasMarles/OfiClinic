// lib/zod-locale.ts
import { z } from 'zod'

/**
 * Mapa de errores en español. Tipamos ancho para evitar choques con
 * variantes "compat" de Zod y deprecations en tipos.
 */
const esErrorMap = (issue: any, ctx: any) => {
  switch (issue?.code) {
    case 'invalid_type': {
      // Requerido (valor ausente / undefined)
      if (issue?.received === 'undefined') {
        return { message: 'Este campo es obligatorio' }
      }
      return { message: 'Tipo de dato inválido' }
    }

    case 'too_small': {
      if (issue?.type === 'string') {
        return { message: `Debe tener al menos ${issue?.minimum} caracteres` }
      }
      if (issue?.type === 'number') {
        return { message: `Debe ser mayor o igual a ${issue?.minimum}` }
      }
      return { message: 'Valor demasiado pequeño' }
    }

    case 'too_big': {
      if (issue?.type === 'string') {
        return { message: `Debe tener como máximo ${issue?.maximum} caracteres` }
      }
      if (issue?.type === 'number') {
        return { message: `Debe ser menor o igual a ${issue?.maximum}` }
      }
      return { message: 'Valor demasiado grande' }
    }

    // Para validaciones personalizadas con refine()/superRefine()
    case 'custom': {
      return { message: issue?.message ?? 'Dato inválido' }
    }

    // Fallback general
    default:
      return { message: ctx?.defaultError ?? 'Dato inválido' }
  }
}

// Algunas builds marcan setErrorMap como deprecated en tipos "compat".
// Funciona correctamente. Casteamos para evitar choques de tipado.
// eslint-disable-next-line deprecation/deprecation
;(z.setErrorMap as any)(esErrorMap)

export {}
