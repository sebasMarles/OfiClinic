export type ColumnType = 'text' | 'number' | 'boolean' | 'date' | 'email' | 'select' | 'currency' | 'badge'
export type ColumnAlignment = 'left' | 'center' | 'right'

export interface ColumnValidation {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: string
  min?: number
  max?: number
  maxDateToday?: boolean
}

export interface ColumnConfig {
  key: string
  title: string
  type: ColumnType
  sortable?: boolean
  filterable?: boolean
  hideable?: boolean
  frozen?: boolean
  width?: number
  align?: ColumnAlignment
  hidden?: boolean
  options?: string[]
  render?: string
  inputMode?: 'text' | 'numeric'
  /** compat: si los JSON creados por el usuario traen `required` a nivel de campo */
  required?: boolean
  /** nuevo bloque de reglas */
  validation?: ColumnValidation
  unique?: boolean
}

export interface RowAction {
  id: string
  label: string
  icon?: string
  variant?: 'default' | 'destructive' | 'outline' | 'ghost'
  action: 'edit' | 'delete' | 'view' | 'custom'
  confirmMessage?: string
}

export interface BulkAction {
  id: string
  label: string
  icon?: string
  variant?: 'default' | 'destructive' | 'outline'
  action: 'delete' | 'export' | 'custom'
  confirmMessage?: string
}

export interface TableConfig {
  model: string
  title: string
  description?: string
  columns: ColumnConfig[]
  rowActions?: RowAction[]
  bulkActions?: BulkAction[]
  enableSelection?: boolean
  enableMultiSelection?: boolean
  enablePagination?: boolean
  pageSize?: number
  enableSearch?: boolean
  searchPlaceholder?: string
  enableFilters?: boolean
  enableExport?: boolean
}
