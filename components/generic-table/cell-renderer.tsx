// src/components/generic-table/cell-renderer.tsx
import { Badge } from '@/components/ui/badge'
import type { ColumnConfig } from '@/types/table-config'
import { format } from 'date-fns'
import { Check, X } from 'lucide-react'

interface CellRendererProps {
  column: ColumnConfig
  value: any
  row: any
}

export function CellRenderer({ column, value, row }: CellRendererProps) {
  if (value === null || value === undefined) {
    return <span className='text-muted-foreground'>-</span>
  }

  switch (column.type) {
    case 'text':
    case 'email':
      return <span className='font-medium'>{String(value)}</span>

    case 'number':
      return <span className='font-mono'>{Number(value).toLocaleString()}</span>

    case 'currency':
      return <span className='font-mono font-semibold'>${Number(value).toFixed(2)}</span>

    case 'boolean':
      return (
        <div className='flex items-center justify-center'>
          {value ? <Check className='h-4 w-4 text-green-600' /> : <X className='h-4 w-4 text-red-600' />}
        </div>
      )

    case 'date':
      const date = new Date(value)
      return <span className='text-sm'>{format(date, 'MMM dd, yyyy')}</span>

    case 'badge':
      const badgeVariant = getBadgeVariant(String(value))
      return (
        <Badge
          variant={badgeVariant}
          className='font-medium'>
          {String(value)}
        </Badge>
      )

    default:
      return <span>{String(value)}</span>
  }
}

function getBadgeVariant(value: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const lowerValue = value.toLowerCase()

  if (lowerValue === 'active' || lowerValue === 'published' || lowerValue === 'admin') {
    return 'default'
  }
  if (lowerValue === 'inactive' || lowerValue === 'draft') {
    return 'secondary'
  }
  if (lowerValue === 'deleted' || lowerValue === 'banned') {
    return 'destructive'
  }
  return 'outline'
}
