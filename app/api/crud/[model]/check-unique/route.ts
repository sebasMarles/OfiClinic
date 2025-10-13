// app/api/crud/[model]/check-unique/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTableConfig } from '@/lib/config-loader'
import * as services from '@/infrastructure/services'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ model: string }> },
) {
  const { model } = await context.params
  const slug = (model || '').toLowerCase()

  const { searchParams } = new URL(request.url)
  const field = searchParams.get('field') || ''
  const value = searchParams.get('value')
  const excludeId = searchParams.get('excludeId') || undefined

  if (!field || value == null) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  const cfg = await getTableConfig(slug)
  if (!cfg) return NextResponse.json({ error: `No hay configuración para ${slug}` }, { status: 400 })

  const col = cfg.columns.find(c => c.key === field)
  if (!col || !col.unique) {
    return NextResponse.json({ error: `El campo ${field} no es único o no existe` }, { status: 400 })
  }

  try {
    const exists = await services.existsByField(slug, field, value, excludeId)
    return NextResponse.json({ exists })
  } catch (e) {
    console.error('check-unique error:', e)
    return NextResponse.json({ error: 'Error verificando unicidad' }, { status: 500 })
  }
}
