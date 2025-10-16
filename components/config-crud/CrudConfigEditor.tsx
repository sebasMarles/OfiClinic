// components/config-crud/CrudConfigEditor.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ColumnConfig, RowAction, BulkAction } from '@/types/table-config'
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
      if (!res.ok) throw new Error('save_failed')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Configuración guardada')
      qc.invalidateQueries({ queryKey: ['config-crud', 'tables'] })
      qc.invalidateQueries({ queryKey: ['config-crud', 'detail', model] })
    },
    onError: () => toast.error('No se pudo guardar'),
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

  const addRowAction = () => {
    if (!draft) return
    const next: RowAction = { id: `act${Date.now()}`, label: 'Editar', action: 'edit', variant: 'ghost', icon: 'pencil' }
    setDraft({ ...draft, rowActions: [...(draft.rowActions || []), next] })
  }

  const removeRowAction = (i: number) => {
    if (!draft) return
    const arr = [...(draft.rowActions || [])]
    arr.splice(i, 1)
    setDraft({ ...draft, rowActions: arr })
  }

  const addBulkAction = () => {
    if (!draft) return
    const next: BulkAction = { id: `bulk${Date.now()}`, label: 'Exportar CSV', action: 'export', variant: 'outline', icon: 'download' }
    setDraft({ ...draft, bulkActions: [...(draft.bulkActions || []), next] })
  }

  const removeBulkAction = (i: number) => {
    if (!draft) return
    const arr = [...(draft.bulkActions || [])]
    arr.splice(i, 1)
    setDraft({ ...draft, bulkActions: arr })
  }

  const disableSave = useMemo(() => {
    if (!draft) return true
    if (!draft.model?.trim()) return true
    if (!draft.title?.trim()) return true
    return false
  }, [draft])

  if (isLoading) return <div className="text-sm text-neutral-500">Cargando…</div>
  if (isError || !draft) return <div className="text-sm text-red-500">Error cargando configuración.</div>

  return (
    <div className="space-y-8">
      {/* Meta */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label className="mb-1.5 block">Modelo</Label>
          <Input
            value={draft.model}
            readOnly
            className="bg-muted/50 pointer-events-none"
            title="El nombre del modelo es inmutable"
          />
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

      {/* Columns */}
      <section className="space-y-3">
        <h4 className="font-semibold">Columnas</h4>

        {(draft.columns || []).length === 0 ? (
          <p className="text-sm text-neutral-500">No hay columnas.</p>
        ) : (
          <div className="space-y-4">
            {(draft.columns || []).map((col, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-3 rounded border p-3">
                <div className="md:col-span-3">
                  <Label className="mb-1.5 block">Key</Label>
                  <Input
                    value={col.key}
                    readOnly
                    className="bg-muted/50 pointer-events-none"
                    title="La clave del campo es inmutable para no romper la referencia en Prisma"
                  />
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
                      checked={!!(col as any).required}
                      onChange={e => updateColumn(i, { ...(col as any), required: e.target.checked })}
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
                  <Button variant="destructive" onClick={() => removeColumn(i)}>Quitar</Button>
                </div>
              </div>
            ))}

            {/* Botón para agregar columna — AL FINAL */}
            <div className="flex justify-end">
              <Button variant="outline" onClick={addColumn}>Agregar columna</Button>
            </div>
          </div>
        )}
      </section>

      {/* Row actions — botón “Agregar” AL FINAL */}
      <section className="space-y-3">
        <h4 className="font-semibold">Row actions</h4>
        {(draft.rowActions || []).length === 0 ? (
          <p className="text-sm text-neutral-500">No hay acciones.</p>
        ) : (
          <div className="space-y-3">
            {(draft.rowActions || []).map((ra, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-3 rounded border p-3">
                <div className="md:col-span-3">
                  <Label className="mb-1.5 block">ID</Label>
                  <Input value={ra.id} onChange={e => {
                    const arr = [...(draft.rowActions || [])]
                    arr[i] = { ...ra, id: e.target.value }
                    setDraft({ ...draft, rowActions: arr })
                  }}/>
                </div>
                <div className="md:col-span-3">
                  <Label className="mb-1.5 block">Label</Label>
                  <Input value={ra.label} onChange={e => {
                    const arr = [...(draft.rowActions || [])]
                    arr[i] = { ...ra, label: e.target.value }
                    setDraft({ ...draft, rowActions: arr })
                  }}/>
                </div>
                <div className="md:col-span-3">
                  <Label className="mb-1.5 block">Action</Label>
                  <Input value={ra.action} onChange={e => {
                    const arr = [...(draft.rowActions || [])]
                    arr[i] = { ...ra, action: e.target.value as any }
                    setDraft({ ...draft, rowActions: arr })
                  }}/>
                </div>
                <div className="md:col-span-3">
                  <Label className="mb-1.5 block">Icon</Label>
                  <Input value={ra.icon ?? ''} onChange={e => {
                    const arr = [...(draft.rowActions || [])]
                    arr[i] = { ...ra, icon: e.target.value }
                    setDraft({ ...draft, rowActions: arr })
                  }}/>
                </div>
                <div className="md:col-span-12 flex justify-end">
                  <Button variant="destructive" onClick={() => removeRowAction(i)}>Quitar</Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="outline" onClick={addRowAction}>Agregar acción</Button>
        </div>
      </section>

      {/* Bulk actions — botón “Agregar” AL FINAL */}
      <section className="space-y-3">
        <h4 className="font-semibold">Bulk actions</h4>
        {(draft.bulkActions || []).length === 0 ? (
          <p className="text-sm text-neutral-500">No hay acciones.</p>
        ) : (
          <div className="space-y-3">
            {(draft.bulkActions || []).map((ba, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-3 rounded border p-3">
                <div className="md:col-span-4">
                  <Label className="mb-1.5 block">ID</Label>
                  <Input value={ba.id} onChange={e => {
                    const arr = [...(draft.bulkActions || [])]
                    arr[i] = { ...ba, id: e.target.value }
                    setDraft({ ...draft, bulkActions: arr })
                  }}/>
                </div>
                <div className="md:col-span-4">
                  <Label className="mb-1.5 block">Label</Label>
                  <Input value={ba.label} onChange={e => {
                    const arr = [...(draft.bulkActions || [])]
                    arr[i] = { ...ba, label: e.target.value }
                    setDraft({ ...draft, bulkActions: arr })
                  }}/>
                </div>
                <div className="md:col-span-4">
                  <Label className="mb-1.5 block">Action</Label>
                  <Input value={ba.action} onChange={e => {
                    const arr = [...(draft.bulkActions || [])]
                    arr[i] = { ...ba, action: e.target.value as any }
                    setDraft({ ...draft, bulkActions: arr })
                  }}/>
                </div>
                <div className="md:col-span-12 flex justify-end">
                  <Button variant="destructive" onClick={() => removeBulkAction(i)}>Quitar</Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="outline" onClick={addBulkAction}>Agregar acción masiva</Button>
        </div>
      </section>

      {/* Guardar */}
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => draft && saveMutation.mutate(draft)}
          disabled={disableSave || saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  )
}
