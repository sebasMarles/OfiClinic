'use client'

import { DynamicForm } from '@/components/generic-table/dynamic-form'
import { GenericTable } from '@/components/generic-table/generic-table'
import { useCreateItem, useDeleteItem, useFetchItems, useUpdateItem } from '@/lib/api-client'
import type { TableConfig } from '@/types/table-config'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

function normalizeDates(formData: any, config: TableConfig) {
  const dateKeys = new Set(config.columns.filter(c => c.type === 'date').map(c => c.key))
  const out: any = { ...formData }
  for (const key of Object.keys(out)) {
    if (dateKeys.has(key)) {
      const v = out[key]
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
        out[key] = new Date(v)
      }
    }
  }
  return out
}

export function CrudPageClient({ config, model }: { config: TableConfig; model: string }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [formOpen, setFormOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<any | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  useEffect(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort()
    abortControllerRef.current = new AbortController()
  }, [page, search, sortBy, sortOrder, model])

  const { data, isLoading, error } = useFetchItems(
    model,
    { page, pageSize: config.pageSize ?? 20, search, sortBy, sortOrder },
    abortControllerRef.current?.signal
  )

  const createMutation = useCreateItem<any>(model)
  const updateMutation = useUpdateItem<any>(model)
  const deleteMutation = useDeleteItem(model)

  const handleRowAction = (action: string, row: any) => {
    if (action === 'edit') {
      setEditingRow(row)
      setFormOpen(true)
    } else if (action === 'delete') {
      if (confirm('¿Estás seguro?')) {
        deleteMutation.mutate(row.id, {
          onSuccess: () => toast.success('Eliminado correctamente'),
          onError: () => toast.error('Error al eliminar'),
        })
      }
    }
  }

  const handleFormSubmit = async (formData: any) => {
    const normalized = normalizeDates(formData, config)

    if (editingRow) {
      updateMutation.mutate(
        { id: editingRow.id, data: normalized },
        {
          onSuccess: () => {
            toast.success('Actualizado correctamente')
            setFormOpen(false)
            setEditingRow(null)
          },
          onError: () => toast.error('Error al actualizar'),
        }
      )
    } else {
      createMutation.mutate(normalized, {
        onSuccess: () => {
          toast.success('Creado correctamente')
          setFormOpen(false)
        },
        onError: () => toast.error('Error al crear'),
      })
    }
  }

  if (error) return <div className="p-6">Error al cargar los datos</div>

  return (
    <>
      <GenericTable
        config={config}
        data={data?.data || []}
        isLoading={isLoading}
        onRowAction={handleRowAction}
        onAdd={() => {
          setEditingRow(null)
          setFormOpen(true)
        }}
        onSearchChange={setSearch}
        searchValue={search}
        onPageChange={setPage}
        onSortChange={(column, direction) => {
          setSortBy(column)
          setSortOrder(direction)
        }}
      />

      <DynamicForm
        open={formOpen}
        onOpenChange={setFormOpen}
        columns={config.columns}
        initialData={editingRow}
        onSubmit={handleFormSubmit}
        title={editingRow ? `Editar ${config.model}` : `Crear ${config.model}`}
        description={config.description}
        modelSlug={(config.model || '').toLowerCase()}   // ✅ pasamos el slug al form para /check-unique
      />
    </>
  )
}
