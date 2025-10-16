// app/(dashboard)/config-crud/[model]/page.tsx
import CrudConfigEditor from '@/components/config-crud/CrudConfigEditor'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ConfigCrudModelPage({
  params,
}: {
  params: Promise<{ model: string }>
}) {
  const { model } = await params

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Editar configuración: {model}</CardTitle>
          <CardDescription>
            Esta pantalla edita <code>config/models/{model}.json</code> y permite sincronizar los campos con <code>prisma/schema.prisma</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CrudConfigEditor model={model} />
        </CardContent>
      </Card>
    </div>
  )
}
