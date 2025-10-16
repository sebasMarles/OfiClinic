'use client'

import CrudConfigGrid from '@/components/config-crud/CrudConfigGrid'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'

export default function ConfigCrudHomePage() {
  const qc = useQueryClient()
  const [running, setRunning] = useState(false)

  const runScript = async () => {
    setRunning(true)
    try {
      const res = await fetch('/api/config-crud/tables', { method: 'POST' })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(data?.error || 'No se pudo ejecutar el script')
      toast.success('Script ejecutado y configuración actualizada')
      // Refresca la lista de modelos
      qc.invalidateQueries({ queryKey: ['config-crud', 'tables'] })
    } catch (e: any) {
      toast.error(e?.message || 'Error al ejecutar el script')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle>Configuración de CRUD (ConfigCrud)</CardTitle>
            <CardDescription>
              Detecta modelos desde <code>schema.prisma</code> / <code>config/models/*.json</code> y permite
              parametrizarlos para el CRUD.
            </CardDescription>
          </div>
          <Button onClick={runScript} disabled={running}>
            <RefreshCw className={`mr-2 h-4 w-4 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Ejecutando...' : 'Ejecutar Script'}
          </Button>
        </CardHeader>
        <CardContent>
          <CrudConfigGrid />
        </CardContent>
      </Card>
    </div>
  )
}
