import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// /api/collections/check?slug=clientes   o   ?title=Clientes
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const title = searchParams.get('title') || ''
    const slugParam = searchParams.get('slug') || ''

    const slug = (slugParam || title)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')

    if (!slug) {
      return NextResponse.json({ exists: false, slug: '' })
    }

    const existing = await prisma.collection.findUnique({ where: { slug } })
    return NextResponse.json({ exists: !!existing, slug })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ exists: false, error: 'check_failed' }, { status: 500 })
  }
}
