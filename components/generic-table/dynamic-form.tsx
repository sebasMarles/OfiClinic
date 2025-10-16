'use client'
import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ColumnConfig, TableConfig } from '@/types/table-config'
import { schemaFromConfig } from '@/domain/validation/schema-from-config'

type UniqueState = { checking: boolean; conflict: boolean; message?: string }

interface DynamicFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: ColumnConfig[]
  initialData?: any
  onSubmit: (data: any) => void
  title: string
  description?: string
  modelSlug?: string
}

export function DynamicForm({
  open,
  onOpenChange,
  columns,
  initialData,
  onSubmit,
  title,
  description,
  modelSlug,
}: DynamicFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>(initialData || {})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // errores de validación (zod)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  // campos “tocados” (para no mostrar errores al abrir)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  // estado de unicidad por campo
  const [uniqueMap, setUniqueMap] = useState<Record<string, UniqueState>>({})
  // se intentó enviar al menos una vez
  const [submittedOnce, setSubmittedOnce] = useState(false)
  // debounce timers por campo
  const timers = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({})

  // al abrir/cambiar registro a editar
  useEffect(() => {
    setFormData(initialData ?? {})
    setFieldErrors({})
    setUniqueMap({})
    setTouched({})
    setSubmittedOnce(false)
  }, [initialData, open])

  // --------- construir cfg local (sincrónico) + schema ---------
  const inferredSlug = useMemo(() => {
    if (modelSlug) return modelSlug
    if (typeof window === 'undefined') return ''
    const segs = window.location.pathname.split('/').filter(Boolean)
    return segs[segs.length - 1] || ''
  }, [modelSlug])

  const cfg: TableConfig = useMemo(() => {
    return {
      model: inferredSlug || '',
      title: title || '',
      columns,
      enableSelection: true,
      enablePagination: true,
    }
  }, [columns, inferredSlug, title])

  const schema = useMemo(() => schemaFromConfig(cfg), [cfg])

  // validación global (para deshabilitar botón aunque no haya “touched”)
  const zres = useMemo(() => schema.safeParse(formData), [schema, formData])

  const editableColumns = columns
  .filter(col => col.key !== 'id' && col.key !== 'createdAt' && col.key !== 'updatedAt')
  .filter(col => !col.hidden && col.render !== 'grid')  // solo form o grid-form


  // ------------ helpers ------------
  const setFieldError = (key: string, msg?: string) => {
    setFieldErrors(prev => {
      const next = { ...prev }
      if (!msg) delete next[key]
      else next[key] = msg
      return next
    })
  }

  const markTouched = (key: string) => {
    setTouched(prev => (prev[key] ? prev : { ...prev, [key]: true }))
  }

  const setUnique = (key: string, patch: Partial<UniqueState>) => {
    setUniqueMap(prev => {
      const curr = prev[key] ?? { checking: false, conflict: false }
      return { ...prev, [key]: { ...curr, ...patch } }
    })
  }

  const debounced = (key: string, fn: () => void, ms = 350) => {
    if (timers.current[key]) clearTimeout(timers.current[key]!)
    timers.current[key] = setTimeout(fn, ms)
  }

  // ------------ validación al vuelo (zod) ------------
  const validateOne = (k: string, v: any) => {
    const obj = { ...formData, [k]: v }
    const res = schema.safeParse(obj)
    if (res.success) {
      setFieldError(k, undefined)
    } else {
      const issue = res.error.issues.find(i => String(i.path[0]) === k)
      setFieldError(k, issue ? issue.message : undefined)
    }
  }

  // ------------ check unicidad (AJAX) ------------
  const checkUnique = async (key: string, value: any) => {
    const col = columns.find(c => c.key === key)
    if (!col?.unique) return

    // si estamos editando y el valor no cambió, no verifiques
    if (initialData && initialData[key] === value) {
      setUnique(key, { checking: false, conflict: false, message: undefined })
      return
    }

    // vacío => no verificamos
    if (value === undefined || value === null || String(value).trim() === '') {
      setUnique(key, { checking: false, conflict: false, message: undefined })
      return
    }

    setUnique(key, { checking: true, conflict: false, message: undefined })
    try {
      const url = `/api/crud/${(inferredSlug || '').toLowerCase()}/check-unique?field=${encodeURIComponent(
        key,
      )}&value=${encodeURIComponent(String(value ?? ''))}${initialData?.id ? `&excludeId=${initialData.id}` : ''}`

      const res = await fetch(url, { cache: 'no-store' })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        // no “asustar” al usuario; solo marcar como sin conflicto pero con mensaje suave si ya tocó el campo
        setUnique(key, { checking: false, conflict: false, message: submittedOnce || touched[key] ? (data?.error || 'No se pudo verificar') : undefined })
      } else {
        setUnique(key, {
          checking: false,
          conflict: !!data?.exists,
          message: data?.exists ? `${col.title} ya está en uso` : undefined,
        })
      }
    } catch {
      setUnique(key, { checking: false, conflict: false, message: submittedOnce || touched[key] ? 'No se pudo verificar' : undefined })
    }
  }

  // ------------ handlers ------------
  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }))
    markTouched(key)
    // valida ese campo
    validateOne(key, value)
    // si es único, chequea en backend (debounced)
    const col = columns.find(c => c.key === key)
    if (col?.unique) debounced(key, () => checkUnique(key, value), 400)
  }

  const handleBlur = (key: string) => {
    markTouched(key)
    const v = formData[key]
    validateOne(key, v)
    const col = columns.find(c => c.key === key)
    if (col?.unique) checkUnique(key, v)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittedOnce(true)

    // validación final
    const parsed = schema.safeParse(formData)
    if (!parsed.success) {
      const map: Record<string, string> = {}
      for (const i of parsed.error.issues) {
        const k = String(i.path[0] ?? '')
        if (k && !map[k]) map[k] = i.message
      }
      setFieldErrors(map)
      return
    }

    // bloquea si hay unicidad en conflicto o aún verificando
    const anyChecking = Object.values(uniqueMap).some(s => s?.checking)
    const anyConflict = Object.values(uniqueMap).some(s => s?.conflict)
    if (anyChecking || anyConflict) return

    setIsSubmitting(true)
    try {
      await onSubmit(parsed.data)
      onOpenChange(false)
      setFormData({})
      setFieldErrors({})
      setUniqueMap({})
      setTouched({})
      setSubmittedOnce(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const disableSubmit = useMemo(() => {
    const anyChecking = Object.values(uniqueMap).some(s => s?.checking)
    const anyConflict = Object.values(uniqueMap).some(s => s?.conflict)
    // deshabilitar si el zod global no es válido (aunque no haya “touched”)
    const invalidZod = !zres.success
    return isSubmitting || invalidZod || anyChecking || anyConflict
  }, [isSubmitting, uniqueMap, zres])

  // ------------ render ------------
  const renderField = (column: ColumnConfig) => {
    const value = formData[column.key] ?? ''
    const ferr = fieldErrors[column.key]
    const ustate = uniqueMap[column.key]
    const showHelp = (submittedOnce || touched[column.key]) && (ustate?.message || ferr)
    const help = showHelp ? (ustate?.message || ferr) : undefined
    const errorClass = help ? 'border-red-500 focus-visible:ring-red-500' : ''

    switch (column.type) {
      case 'text':
      case 'email':
        return (
          <>
            <Input
              id={column.key}
              type={column.type}
              value={value}
              onChange={e => handleChange(column.key, e.target.value)}
              onBlur={() => handleBlur(column.key)}
              placeholder={`Ingresa ${column.title.toLowerCase()}`}
              className={errorClass}
              aria-invalid={!!help}
            />
            {help && <p className="mt-1 text-xs text-red-600">{help}</p>}
          </>
        )

      case 'number':
      case 'currency':
        return (
          <>
            <Input
              id={column.key}
              inputMode="numeric"
              // quitamos pattern para evitar :invalid nativo
              type="text"
              value={value}
              onChange={e => {
                const raw = e.target.value
                const cleaned =
                  column.type === 'currency' ? raw.replace(/[^0-9.]/g, '') : raw.replace(/\D/g, '')
                handleChange(column.key, cleaned)
              }}
              onBlur={() => handleBlur(column.key)}
              placeholder={`Ingresa ${column.title.toLowerCase()}`}
              className={errorClass}
              aria-invalid={!!help}
            />
            {help && <p className="mt-1 text-xs text-red-600">{help}</p>}
          </>
        )

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={column.key}
              checked={Boolean(value)}
              onCheckedChange={checked => {
                markTouched(column.key)
                handleChange(column.key, Boolean(checked))
              }}
            />
            <label htmlFor={column.key} className="text-sm font-medium leading-none">
              {column.title}
            </label>
            {help && <p className="ml-3 text-xs text-red-600">{help}</p>}
          </div>
        )

      case 'select':
      case 'badge':
        return (
          <>
            <Select
              value={value}
              onValueChange={val => handleChange(column.key, val)}
            >
              <SelectTrigger id={column.key} className={errorClass} aria-invalid={!!help}>
                <SelectValue placeholder={`Selecciona ${column.title.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {column.options?.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {help && <p className="mt-1 text-xs text-red-600">{help}</p>}
          </>
        )

      case 'date':
        return (
          <>
            <Input
              id={column.key}
              type="date"
              value={value ? new Date(value).toISOString().split('T')[0] : ''}
              onChange={e => handleChange(column.key, e.target.value)}
              onBlur={() => handleBlur(column.key)}
              className={errorClass}
              aria-invalid={!!help}
            />
            {help && <p className="mt-1 text-xs text-red-600">{help}</p>}
          </>
        )

      default:
        return (
          <>
            <Textarea
              id={column.key}
              value={value}
              onChange={e => handleChange(column.key, e.target.value)}
              onBlur={() => handleBlur(column.key)}
              placeholder={`Ingresa ${column.title.toLowerCase()}`}
              rows={3}
              className={errorClass}
              aria-invalid={!!help}
            />
            {help && <p className="mt-1 text-xs text-red-600">{help}</p>}
          </>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editableColumns.map(column => (
              <div key={column.key} className={column.type === 'boolean' ? 'col-span-full' : ''}>
                {column.type !== 'boolean' && (
                  <Label htmlFor={column.key} className="mb-2 block">
                    {column.title}{column.unique ? ' (único)' : ''}
                  </Label>
                )}
                {renderField(column)}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={disableSubmit}>
              {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
