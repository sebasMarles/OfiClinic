'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'

type FieldType = 'text' | 'number' | 'boolean' | 'date' | 'email' | 'select' | 'currency' | 'badge'
type FieldDraft = {
  key: string
  title: string
  type: FieldType
  optionsText?: string
  required: boolean
  filterable: boolean
  hidden: boolean
}

const FIELD_TYPES: FieldType[] = ['text', 'number', 'boolean', 'date', 'email', 'select', 'currency', 'badge']

function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function keyify(s: string) {
  const clean = s.replace(/[^a-zA-Z0-9 ]/g, ' ').trim()
  const parts = clean.split(/\s+/)
  if (parts.length === 0) return ''
  return parts[0].toLowerCase() + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('')
}

export default function CreateCollectionButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const computedSlug = useMemo(() => (slug ? slugify(slug) : slugify(title)), [slug, title])

  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<FieldDraft[]>([
    { key: 'name', title: 'Nombre', type: 'text', required: true, filterable: true, hidden: false },
  ])
  const [submitting, setSubmitting] = useState(false)

  const [checking, setChecking] = useState(false)
  const [exists, setExists] = useState<boolean | null>(null)
  const [debouncedSlug, setDebouncedSlug] = useState(computedSlug)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSlug(computedSlug), 350)
    return () => clearTimeout(id)
  }, [computedSlug])

  useEffect(() => {
    if (!debouncedSlug) {
      setExists(null)
      return
    }
    const ctrl = new AbortController()
    ;(async () => {
      try {
        setChecking(true)
        const res = await fetch(`/api/collections/check?slug=${encodeURIComponent(debouncedSlug)}`, {
          signal: ctrl.signal,
          cache: 'no-store',
        })
        const data = await res.json().catch(() => ({}))
        setExists(!!data?.exists)
      } catch {
        setExists(null)
      } finally {
        setChecking(false)
      }
    })()
    return () => ctrl.abort()
  }, [debouncedSlug])

  const addField = () => {
    setFields(prev => [
      ...prev,
      { key: `field${prev.length + 1}`, title: `Campo ${prev.length + 1}`, type: 'text', required: false, filterable: true, hidden: false },
    ])
  }

  const removeField = (idx: number) => setFields(prev => prev.filter((_, i) => i !== idx))
  const updateField = (idx: number, patch: Partial<FieldDraft>) =>
    setFields(prev => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)))

  const validate = () => {
    if (!title.trim()) return 'El título es obligatorio'
    if (!computedSlug) return 'El slug resultante es vacío'
    const keys = fields.map(f => f.key.trim()).filter(Boolean)
    if (keys.length !== fields.length) return 'Todos los campos deben tener clave (key)'
    const dup = keys.find((k, i) => keys.indexOf(k) !== i)
    if (dup) return `Hay claves duplicadas: "${dup}"`
    const invalidKey = keys.find(k => !/^[a-zA-Z][a-zA-Z0-9]*$/.test(k))
    if (invalidKey) return `Clave inválida: "${invalidKey}". Usa letras y números, iniciando con letra (sin espacios).`
    if (exists) return 'Ya existe una categoría con ese nombre'
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        slug: computedSlug,
        title: title.trim(),
        description: description.trim() || undefined,
        fields: fields.map((f, order) => ({
          key: f.key.trim(),
          title: f.title.trim() || f.key,
          type: f.type,
          required: !!f.required,
          filterable: !!f.filterable,
          hidden: !!f.hidden,
          options:
            f.type === 'select' || f.type === 'badge'
              ? { options: (f.optionsText ?? '').split(',').map(s => s.trim()).filter(Boolean) }
              : undefined,
          order,
        })),
      }

      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.status === 409) {
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error || 'La categoría ya existe')
        router.push(`/crud/${computedSlug}`)
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'No se pudo crear la categoría')
      }

      toast.success('Categoría creada')
      setOpen(false)
      setTitle('')
      setSlug('')
      setDescription('')
      setFields([{ key: 'name', title: 'Nombre', type: 'text', required: true, filterable: true, hidden: false }])

      router.push(`/crud/${computedSlug}`)
    } catch (e: any) {
      toast.error(e.message || 'Error al crear la categoría')
    } finally {
      setSubmitting(false)
    }
  }

  const disableCreate =
    submitting || checking || exists === true || !title.trim() || fields.length === 0

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-purple-300 text-purple-900 hover:bg-purple-400 border-0"
      >
        Crear nueva categoría
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="xl" className="max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Crear nueva categoría</DialogTitle>
          </DialogHeader>

          <div className="space-y-8">
            {/* Meta */}
            <section className="space-y-4">
              <h4 className="font-semibold text-neutral-800 dark:text-neutral-200">Información general</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="title" className="mb-1.5 block">Título</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className={cn(
                      exists ? 'border-red-500 focus-visible:ring-red-500' : '',
                      'h-10'
                    )}
                    placeholder="Clientes, Inventario, etc."
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Slug final: <span className="font-mono">{computedSlug || '-'}</span>
                  </p>
                  {exists && (
                    <p className="mt-1 text-sm text-red-600">
                      Ya existe una categoría con ese nombre.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="slug" className="mb-1.5 block">Slug (opcional)</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    placeholder="clientes"
                    className="h-10"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="desc" className="mb-1.5 block">Descripción (opcional)</Label>
                  <Input
                    id="desc"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Descripción de la categoría"
                    className="h-10"
                  />
                </div>
              </div>
            </section>

            {/* Campos */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-neutral-800 dark:text-neutral-200">Campos</h4>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addField}
                  className="border-purple-300 text-purple-900 hover:bg-purple-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar campo
                </Button>
              </div>

              <div className="space-y-5">
                {fields.map((f, idx) => (
                  <div key={idx} className="rounded-xl border p-4 md:p-5 space-y-4 bg-white/50 dark:bg-neutral-900/30">
                    {/* fila principal de inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
                      {/* Key */}
                      <div className="md:col-span-3">
                        <Label className="mb-1.5 block">Key</Label>
                        <Input
                          value={f.key}
                          onChange={(e) => updateField(idx, { key: e.target.value })}
                          onBlur={() => {
                            if (!fields[idx].key && fields[idx].title) {
                              updateField(idx, { key: keyify(fields[idx].title) })
                            }
                          }}
                          placeholder="name, email, phone..."
                          className="h-10"
                        />

                        {/* ✅ checkboxes debajo del Select y juntos */}
                        <div className="mt-2 grid grid-cols-3 gap-x-25 gap-y-1">
                          <label className="flex items-center gap-2 text-xs md:text-sm">
                            <Checkbox
                              checked={f.required}
                              onCheckedChange={(v) => updateField(idx, { required: Boolean(v) })}
                            />
                            Requerido
                          </label>
                          <label className="flex items-center gap-2 text-xs md:text-sm">
                            <Checkbox
                              checked={f.filterable}
                              onCheckedChange={(v) => updateField(idx, { filterable: Boolean(v) })}
                            />
                            Filtrable
                          </label>
                          <label className="flex items-center gap-2 text-xs md:text-sm">
                            <Checkbox
                              checked={f.hidden}
                              onCheckedChange={(v) => updateField(idx, { hidden: Boolean(v) })}
                            />
                            Oculto
                          </label>
                        </div>
                      </div>

                      {/* Título */}
                      <div className="md:col-span-4">
                        <Label className="mb-1.5 block">Título</Label>
                        <Input
                          value={f.title}
                          onChange={(e) => updateField(idx, { title: e.target.value })}
                          onBlur={(e) => {
                            if (!fields[idx].key) {
                              updateField(idx, { key: keyify(e.currentTarget.value) })
                            }
                          }}
                          placeholder="Nombre, Email..."
                          className="h-10"
                        />
                      </div>

                      {/* Tipo + toggles compactos debajo */}
                      <div className="md:col-span-5">
                        <Label className="mb-1.5 block">Tipo</Label>
                        <Select value={f.type} onValueChange={(val: any) => updateField(idx, { type: val })}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Tipo de dato" />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        
                      </div>
                    </div>

                    {/* Opciones (si aplica) */}
                    {(f.type === 'select' || f.type === 'badge') && (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
                        <div className="md:col-span-6">
                          <Label className="mb-1.5 block">Opciones (separadas por coma)</Label>
                          <Input
                            value={f.optionsText ?? ''}
                            onChange={(e) => updateField(idx, { optionsText: e.target.value })}
                            placeholder="Activo, Inactivo, Pendiente"
                            className="h-10"
                          />
                        </div>
                      </div>
                    )}

                    {/* Quitar campo */}
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => removeField(idx)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Quitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Acciones */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="border-purple-300 text-purple-900 hover:bg-purple-50"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={disableCreate}
                className={cn(
                  'border-0',
                  exists
                    ? 'bg-neutral-300 text-neutral-700 cursor-not-allowed'
                    : 'bg-purple-300 text-purple-900 hover:bg-purple-400'
                )}
              >
                {submitting ? 'Creando...' : checking ? 'Verificando...' : exists ? 'Nombre no disponible' : 'Crear categoría'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
