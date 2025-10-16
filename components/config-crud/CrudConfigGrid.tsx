'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Settings } from 'lucide-react'
import { toast } from 'sonner'
import type { ConfigCrudStatus } from '@/types/config-crud'

type TableItem = {
  model: string
  title: string
  status: ConfigCrudStatus
}

type TablesResponse = { models: TableItem[] }

function StatusBadge({ status }: { status: ConfigCrudStatus }) {
  const cls =
    status === 'parametrized'
      ? 'bg-green-100 text-green-800 border-0'
      : status === 'inactive'
      ? 'bg-red-100 text-red-800 border-0'
      : 'bg-yellow-100 text-yellow-800 border-0'
  return <Badge className={cls}>{status}</Badge>
}

function cardTone(status: ConfigCrudStatus) {
  if (status === 'parametrized') return 'bg-green-50 border-green-100'
  if (status === 'unset') return 'bg-yellow-50 border-yellow-100'
  // inactive → incoloro (sin fondo especial)
  return ''
}

export default function CrudConfigGrid() {
  const router = useRouter()

  const { data, isLoading, isError } = useQuery<TablesResponse>({
    queryKey: ['config-crud', 'tables'],
    queryFn: async () => {
      const res = await fetch('/api/config-crud/tables', { cache: 'no-store' })
      if (!res.ok) throw new Error('failed')
      return res.json()
    },
  })

  const groups = useMemo(() => {
    const items = data?.models ?? []
    return {
      parametrized: items.filter(m => m.status === 'parametrized'),
      inactive: items.filter(m => m.status === 'inactive'),
      unset: items.filter(m => m.status === 'unset'),
    }
  }, [data])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando modelos…
      </div>
    )
  }

  if (isError || !data) {
    return <div className="text-sm text-red-500">No se pudieron cargar los modelos.</div>
  }

  const Section = ({
    title,
    items,
  }: {
    title: string
    items: TableItem[]
  }) => (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-700">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">Sin elementos.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(m => {
            const isInactive = m.status === 'inactive'
            return (
              <Card
                key={m.model}
                className={`flex flex-col transition-colors ${cardTone(m.status)}`}
              >
                <CardHeader className="space-y-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="truncate">{m.title || m.model}</CardTitle>
                    <StatusBadge status={m.status} />
                  </div>
                  <CardDescription className="truncate font-mono text-xs">
                    {m.model}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between gap-2">
                  <div className="text-xs text-neutral-500">
                    {isInactive
                      ? 'Bloqueado por estado: inactive'
                      : m.status === 'unset'
                      ? 'Detectado: sin configurar'
                      : 'Listo y parametrizado'}
                  </div>
                  <Button
                    size="sm"
                    variant={isInactive ? 'secondary' : 'default'}
                    disabled={isInactive}
                    onClick={() => {
                      if (isInactive) {
                        toast.info(
                          'Este modelo está en estado "inactive". Cámbialo a "parametrized" en config/models/<Modelo>.json o en el tag /// @crud(status: parametrized) y sincroniza.',
                        )
                        return
                      }
                      router.push(`/config-crud/${m.model}`)
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {isInactive ? 'Inactivo' : 'Configurar'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Leyenda / recordatorio de estados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estados del modelo (desde JSON / schema)</CardTitle>
          <CardDescription>
            Estos estados se definen en <code>config/models/&lt;Modelo&gt;.json</code> (propiedad{' '}
            <code>status</code>) o con la anotación en el schema:{' '}
            <code>/// @crud(status: parametrized|inactive|unset)</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2">
            <StatusBadge status="parametrized" />{' '}
            <span>
              <b>parametrized</b>: visible y editable. Puedes abrir el detalle y configurar columnas.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status="inactive" />{' '}
            <span>
              <b>inactive</b>: bloqueado. No podrás abrir el detalle hasta cambiar el estado a{' '}
              <b>parametrized</b> en el JSON o anotación del schema y volver a sincronizar.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status="unset" />{' '}
            <span>
              <b>unset</b>: detectado pero sin parametrizar. Puedes abrir y ajustar su configuración.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Grupos */}
      <Section title="Parametrizados" items={groups.parametrized} />
      <Section title="Inactivos" items={groups.inactive} />
      <Section title="Detectados (unset)" items={groups.unset} />
    </div>
  )
}
