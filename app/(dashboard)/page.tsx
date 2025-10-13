'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import CreateCollectionButton from '@/components/builder/CreateCollectionButton'
import CollectionsGrid from '@/components/builder/CollectionsGrid'
import { Stethoscope, Users } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Encabezado + acción rápida */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
          Bienvenido a OfiClinic
        </h2>
        <CreateCollectionButton />
      </div>

      <p className="text-neutral-600 dark:text-neutral-400">
        Elige una sección para gestionar registros o crea una nueva categoría dinámica.
      </p>

      {/* Acciones principales estáticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="flex flex-col">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <CardTitle>Gestionar Pacientes</CardTitle>
            </div>
            <CardDescription>Crear, editar y administrar pacientes.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Link href="/crud/Patient">
              <Button className="w-full">Ir a Pacientes</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-purple-600" />
              <CardTitle>Gestionar Profesionales</CardTitle>
            </div>
            <CardDescription>Crear, editar y administrar profesionales de la salud.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Link href="/crud/Professional">
              <Button className="w-full">Ir a Profesionales</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Categorías dinámicas creadas por el usuario */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Categorías dinámicas</h3>
        <CollectionsGrid />
      </div>
    </div>
  )
}
