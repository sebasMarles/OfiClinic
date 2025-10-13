import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getTableConfig } from '@/lib/config-loader'
import { CrudPageClient } from './page.client'


export default async function CrudPage({ params }: { params: Promise<{ model: string }> }) {
  const { model } = await params
  const config = await getTableConfig(model)

  if (!config) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Modelo no encontrado</CardTitle>
            <CardDescription>El modelo "{model}" no tiene configuración (estática ni dinámica).</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return <CrudPageClient config={config} model={model.toLowerCase()} />
}
