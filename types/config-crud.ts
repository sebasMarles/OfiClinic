// types/config-crud.ts
import type { ColumnConfig, RowAction, BulkAction } from '@/types/table-config'

export type ConfigCrudStatus = 'parametrized' | 'inactive' | 'unset'

export interface RelationConfig {
  // ejemplo: belongsTo Patient via patientId -> Patient.id
  type: 'belongsTo' | 'hasMany' | 'manyToMany'
  model: string
  localKey?: string
  foreignKey?: string
  // para M:N podrías añadir joinModel, etc.
}

export interface SelectSource {
  model: string           // Prisma model para opciones
  valueField: string      // clave (ej. 'id' o 'code')
  labelField: string      // etiqueta (ej. 'description' o 'fullName')
  where?: Record<string, any> // filtros opcionales
  orderBy?: Record<string, 'asc' | 'desc'>
  limit?: number
}

export interface ColumnConfigExtended extends ColumnConfig {
  // Si no hay "options" estático, puedes poblar desde un modelo
  optionsSource?: SelectSource
}

export interface ConfigCrudEntry {
  model: string
  title: string
  description?: string
  status: ConfigCrudStatus
  columns: ColumnConfigExtended[]
  rowActions?: RowAction[]
  bulkActions?: BulkAction[]
  relations?: RelationConfig[]
  // Hook visual opcional (containerId) para personalizar
  containerId?: string
}
