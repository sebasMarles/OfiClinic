// src/components/generic-table/table-toolbar.tsx
'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import type { BulkAction, ColumnConfig } from '@/types/table-config'
import { Columns3, Download, Plus, Search } from 'lucide-react'

interface TableToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  columns: ColumnConfig[]
  visibleColumns: Set<string>
  onColumnVisibilityChange: (columnKey: string) => void
  selectedCount: number
  bulkActions?: BulkAction[]
  onBulkAction: (actionId: string) => void
  onAdd?: () => void
  enableExport?: boolean
  onExport?: () => void
}

export function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  columns,
  visibleColumns,
  onColumnVisibilityChange,
  selectedCount,
  bulkActions = [],
  onBulkAction,
  onAdd,
  enableExport,
  onExport,
}: TableToolbarProps) {
  const hideableColumns = columns.filter(col => col.hideable)

  return (
    <div className='flex items-center justify-between gap-4 py-4'>
      <div className='flex flex-1 items-center gap-2'>
        <div className='relative flex-1 max-w-sm'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            className='pl-9'
          />
        </div>

        {selectedCount > 0 && bulkActions.length > 0 && (
          <div className='flex items-center gap-2'>
            <span className='text-sm text-muted-foreground'>{selectedCount} selected</span>
            {bulkActions.map(action => (
              <Button
                key={action.id}
                variant={action.variant || 'outline'}
                size='sm'
                onClick={() => onBulkAction(action.id)}>
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className='flex items-center gap-2'>
        {enableExport && onExport && (
          <Button
            variant='outline'
            size='sm'
            onClick={onExport}>
            <Download className='mr-2 h-4 w-4' />
            Export
          </Button>
        )}

        {hideableColumns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='outline'
                size='sm'>
                <Columns3 className='mr-2 h-4 w-4' />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align='end'
              className='w-48'>
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hideableColumns.map(column => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={visibleColumns.has(column.key)}
                  onCheckedChange={() => onColumnVisibilityChange(column.key)}>
                  {column.title}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {onAdd && (
          <Button
            size='sm'
            onClick={onAdd}>
            <Plus className='mr-2 h-4 w-4' />
            Add New
          </Button>
        )}
      </div>
    </div>
  )
}
