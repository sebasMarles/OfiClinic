// components/config-crud/CrudConfigEditor.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ColumnConfig } from '@/types/table-config'
import type { ConfigCrudEntry } from '@/types/config-crud'
import { toast } from 'sonner'

type Props = { model: string }

const TYPES: ColumnConfig['type'][] = ['text','number','boolean','date','email','select','currency','badge']

export default function CrudConfigEditor({ model }: Props) {
  const qc = useQueryClient()
  const [draft, setDraft] = useState<ConfigCrudEntry | null>(null)

  const { data, isLoading, isError } = useQuery<ConfigCrudEntry>({
    queryKey: ['config-crud', 'detail', model],
    queryFn: async () => {
      const res = await fetch(`/api/config-crud/${model}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('failed')
      return res.json()
    },
  })

  useEffect(() => {
    if (data) setDraft(data)
  }, [data])

  const saveMutation = useMutation({
    mutationFn: async (payload: ConfigCrudEntry) => {
      const res = await fetch(`/api/config-crud/${model}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const msg = await res.text().catch(()=>'')
        throw new Error(msg || 'save_failed')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('JSON guardado en config/models.')
      qc.invalidateQueries({ queryKey: ['config-crud', 'tables'] })
      qc.invalidateQueries({ queryKey: ['config-crud', 'detail', model] })
    },
    onError: (e:any) => toast.error(e?.message || 'No se pudo guardar'),
  })

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/config-crud/${model}/sync`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(()=>({}))
        throw new Error(data?.error || 'sync_failed')
      }
      return res.json()
    },
    onSuccess: (out:any) => {
      toast.success('Schema actualizado. Luego ejecuta:\n$ npx prisma migrate dev')
      if (out?.warnings?.length) {
        out.warnings.forEach((w:string)=>toast.warning(w))
      }
    },
    onError: (e:any) => toast.error(e?.message || 'No se pudo sincronizar con Prisma'),
  })

  const addColumn = () => {
    if (!draft) return
    const next: ColumnConfig = {
      key: `field${(draft.columns?.length ?? 0) + 1}`,
      title: 'Nuevo campo',
      type: 'text',
      sortable: true,
      filterable: true,
    }
    setDraft({ ...draft, columns: [...(draft.columns || []), next] })
  }

  const removeColumn = (i: number) => {
    if (!draft) return
    const cols = [...(draft.columns || [])]
    cols.splice(i, 1)
    setDraft({ ...draft, columns: cols })
  }

  const updateColumn = (i: number, patch: Partial<ColumnConfig>) => {
    if (!draft) return
    const cols = [...(draft.columns || [])]
    cols[i] = { ...cols[i], ...patch }
    setDraft({ ...draft, columns: cols })
  }

  const disableSave = useMemo(() => {
    if (!draft) return true
    if (!draft.model?.trim()) return true
    if (!draft.title?.trim()) return true
    // claves válidas
    const keys = (draft.columns || []).map(c => c.key?.trim()).filter(Boolean)
    if (keys.length !== (draft.columns || []).length) return true
    const dup = keys.find((k, i) => keys.indexOf(k) !== i)
    if (dup) return true
    return false
  }, [draft])

  if (isLoading) return <div className="text-sm text-neutral-500">Cargando…</div>
  if (isError || !draft) return <div className="text-sm text-red-500">Error cargando configuración.</div>

  return (
    <div className="space-y-8">
      {/* Meta */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Modelo (solo lectura) */}
        <div>
          <Label className="mb-1.5 block">Modelo</Label>
          <Input value={draft.model} readOnly disabled />
          <p className="text-xs text-neutral-500 mt-1">
            Nombre de modelo Prisma. El archivo se guarda como <code>config/models/{draft.model}.json</code>.
          </p>
        </div>
        <div>
          <Label className="mb-1.5 block">Título</Label>
          <Input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label className="mb-1.5 block">Descripción</Label>
          <Textarea
            value={draft.description ?? ''}
            onChange={e => setDraft({ ...draft, description: e.target.value })}
          />
        </div>
        <div>
          <Label className="mb-1.5 block">Estado</Label>
          <Select
            value={draft.status}
            onValueChange={(v: any) => setDraft({ ...draft, status: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="parametrized">parametrized</SelectItem>
              <SelectItem value="inactive">inactive</SelectItem>
              <SelectItem value="unset">unset</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Campos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Campos</h4>
          <Button variant="outline" onClick={addColumn}>Agregar campo</Button>
        </div>

        {(draft.columns || []).length === 0 ? (
          <p className="text-sm text-neutral-500">No hay campos.</p>
        ) : (
          <div className="space-y-4">
            {(draft.columns || []).map((col, i) => {
              const req = (col as any).required ?? col.validation?.required ?? false
              return (
                <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-3 rounded border p-3">
                  <div className="md:col-span-3">
                    <Label className="mb-1.5 block">Key</Label>
                    <Input value={col.key} onChange={e => updateColumn(i, { key: e.target.value })} />
                  </div>
                  <div className="md:col-span-3">
                    <Label className="mb-1.5 block">Título</Label>
                    <Input value={col.title} onChange={e => updateColumn(i, { title: e.target.value })} />
                  </div>
                  <div className="md:col-span-3">
                    <Label className="mb-1.5 block">Tipo</Label>
                    <Select value={col.type} onValueChange={(v: any) => updateColumn(i, { type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3">
                    <Label className="mb-1.5 block">Opciones (CSV)</Label>
                    <Input
                      value={(col.options || []).join(',')}
                      onChange={e => updateColumn(i, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      placeholder="Activo, Inactivo..."
                      disabled={!['select','badge'].includes(col.type)}
                    />
                  </div>

                  <div className="md:col-span-12 grid grid-cols-2 md:grid-cols-6 gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!col.sortable}
                        onChange={e => updateColumn(i, { sortable: e.target.checked })}
                      /> sortable
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!col.filterable}
                        onChange={e => updateColumn(i, { filterable: e.target.checked })}
                      /> filterable
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!col.hideable}
                        onChange={e => updateColumn(i, { hideable: e.target.checked })}
                      /> hideable
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!req}
                        onChange={e => {
                          // guardamos en validation.required para que zod y prisma writer lo vean
                          const nextVal = e.target.checked
                          updateColumn(i, { validation: { ...(col.validation || {}), required: nextVal } as any })
                        }}
                      /> required
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!col.frozen}
                        onChange={e => updateColumn(i, { frozen: e.target.checked })}
                      /> frozen
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!col.unique}
                        onChange={e => updateColumn(i, { unique: e.target.checked })}
                      /> unique
                    </label>
                  </div>

                  <div className="md:col-span-12 flex justify-end">
                    <Button variant="destructive" onClick={() => removeColumn(i)}>Eliminar</Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Acciones */}
      <div className="flex flex-col md:flex-row gap-2 justify-end">
        <Button
          variant="outline"
          onClick={() => draft && saveMutation.mutate(draft)}
          disabled={disableSave || saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Guardando JSON…' : 'Guardar JSON'}
        </Button>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? 'Sincronizando…' : 'Sincronizar Prisma'}
        </Button>
      </div>

      <p className="text-xs text-neutral-500">
        Después de sincronizar Prisma, ejecuta en tu terminal:
        <code className="ml-2 font-mono">$ npx prisma migrate dev</code>
      </p>
    </div>
  )
}
