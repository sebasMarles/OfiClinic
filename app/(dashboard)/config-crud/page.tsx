// app/(dashboard)/config-crud/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Play } from 'lucide-react'

type ModelItem = { name: string }

export default function ConfigCrudIndexPage() {
  const [models, setModels] = useState<ModelItem[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchModels = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/config-crud/tables', { cache: 'no-store' })
      if (!res.ok) throw new Error('No se pudieron cargar los modelos')
      const json = await res.json()
      setModels(Array.isArray(json?.data) ? json.data : [])
    } catch (e: any) {
      setError(e?.message || 'Error cargando modelos')
      setModels([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchModels()
  }, [])

  const runScript = async () => {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch('/api/config-crud/tables?run=1', { cache: 'no-store' })
      if (!res.ok) throw new Error('No se pudo ejecutar el script')
      // refresca
      await fetchModels()
    } catch (e: any) {
      setError(e?.message || 'Error ejecutando script')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Config CRUD</h2>
          <p className="text-sm text-muted-foreground">
            Esta vista muestra los modelos descubiertos desde <code>schema.prisma</code> (aquellos marcados con
            <span className="mx-1 font-mono">/// @crud</span> o que comienzan por <span className="font-mono">Crud</span>).
          </p>
        </div>
        <Button onClick={runScript} disabled={running}>
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Ejecutar Script
        </Button>
      </div>

      {error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando modelos…
        </div>
      ) : models.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin modelos</CardTitle>
            <CardDescription>
              No hay entradas en <code>config/crud/crudTable.json</code>. Usa “Ejecutar Script” para generarlas.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {models.map((m) => (
            <Link key={m.name} href={`/config-crud/${m.name}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{m.name}</CardTitle>
                  <CardDescription>Edita los detalles de este modelo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    Ruta: <code>/config-crud/{m.name}</code>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Nota: esta pantalla solo lista el <strong>name</strong> de cada modelo según <code>crudTable.json</code>.
      </p>
    </div>
  )
}
