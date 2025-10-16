// components/config-crud/CrudConfigGrid.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

type ModelItem = { name: string }

export default function CrudConfigGrid() {
  const { data, isLoading, isError, refetch } = useQuery<{ data: ModelItem[] }>({
    queryKey: ['config-crud', 'tables'],
    queryFn: async () => {
      const res = await fetch('/api/config-crud/tables', { cache: 'no-store' })
      if (!res.ok) throw new Error('fetch_failed')
      return res.json()
    },
  })

  const runScript = async () => {
    try {
      const res = await fetch('/api/config-crud/tables?run=1', { cache: 'no-store' })
      if (!res.ok) throw new Error('script_failed')
      toast.success('Script ejecutado')
      refetch()
    } catch {
      toast.error('No se pudo ejecutar el script')
    }
  }

  if (isLoading) {
    return <div className="flex items-center gap-2 text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" />Cargando…</div>
  }
  if (isError || !data) return <div className="text-sm text-red-500">No se pudo cargar la lista.</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Modelos (desde <code>crudTable.json</code>)</h3>
        <Button variant="outline" size="sm" onClick={runScript}>
          <RefreshCw className="h-4 w-4 mr-2" /> Ejecutar Script
        </Button>
      </div>

      {data.data.length === 0 ? (
        <Card>
          <CardHeader><CardTitle>Sin modelos</CardTitle></CardHeader>
          <CardContent className="text-sm text-neutral-500">
            Aún no hay entradas en <code>config/crud/crudTable.json</code>. Ejecuta tu script para generarlas.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.data.map((m) => (
            <Link key={m.name} href={`/config-crud/${m.name}`}>
              <Card className="hover:shadow-md transition">
                <CardHeader><CardTitle>{m.name}</CardTitle></CardHeader>
                <CardContent className="text-xs text-neutral-500">
                  Abrir configuración
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
