'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, FolderOpen } from 'lucide-react'

type CollectionItem = {
  id: string
  slug: string
  title: string
  description?: string
  fieldsCount: number
  recordsCount: number
}

export default function CollectionsGrid() {
  const { data, isLoading, isError } = useQuery<{ data: CollectionItem[] }>({
    queryKey: ['collections'],
    queryFn: async () => {
      const res = await fetch('/api/collections', { cache: 'no-store' })
      if (!res.ok) throw new Error('Error fetching collections')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando categorías...
      </div>
    )
  }

  if (isError || !data) {
    return <div className="text-sm text-red-500">No se pudieron cargar las categorías.</div>
  }

  if (data.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Categorías dinámicas</CardTitle>
          <CardDescription>No has creado ninguna categoría aún.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-neutral-500">
          Usa “Crear nueva categoría” para empezar.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {data.data.map((c) => (
        <Card key={c.id} className="flex flex-col">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-purple-600" />
              <CardTitle>{c.title}</CardTitle>
            </div>
            <CardDescription className="truncate">{c.description || c.slug}</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-3">
              <span>{c.fieldsCount} campos</span>
              <span>{c.recordsCount} registros</span>
            </div>
            <Link href={`/crud/${c.slug}`}>
              <Button className="w-full">Abrir “{c.slug}”</Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
