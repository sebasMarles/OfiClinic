import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  try {
    const collections = await prisma.collection.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { fields: true, records: true } },
      },
    })

    return NextResponse.json({
      data: collections.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        fieldsCount: (c as any)._count?.fields ?? 0,
        recordsCount: (c as any)._count?.records ?? 0,
      })),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to list collections' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { slug, title, description, fields } = body as {
      slug: string
      title: string
      description?: string
      fields: Array<{
        key: string
        title: string
        type: string
        options?: any
        required?: boolean
        filterable?: boolean
        hidden?: boolean
        order?: number
      }>
    }

    if (!slug || !title || !Array.isArray(fields)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const normalized = slug.toLowerCase()

    // Evita error críptico: verifica existencia antes
    const existing = await prisma.collection.findUnique({ where: { slug: normalized } })
    if (existing) {
      return NextResponse.json(
        { error: `La categoría "${normalized}" ya existe.`, slug: normalized },
        { status: 409 },
      )
    }

    const created = await prisma.collection.create({
      data: {
        slug: normalized,
        title,
        description,
        fields: {
          create: fields.map((f, i) => ({
            key: f.key,
            title: f.title,
            type: f.type,
            options: f.options ?? undefined,
            required: !!f.required,
            filterable: f.filterable ?? true,
            hidden: !!f.hidden,
            order: typeof f.order === 'number' ? f.order : i,
          })),
        },
      },
      include: { fields: true },
    })

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (e: any) {
    // Si por carrera llega P2002, devuelve 409 amigable
    if (e?.code === 'P2002') {
      return NextResponse.json(
        { error: 'El slug ya existe, elige otro nombre.' },
        { status: 409 },
      )
    }
    console.error(e)
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 })
  }
}
