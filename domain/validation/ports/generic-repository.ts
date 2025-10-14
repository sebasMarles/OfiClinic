// domain/ports/generic-repository.ts
export type ListParams = {
  skip?: number
  take?: number
  where?: any
  orderBy?: any
  select?: any
  include?: any
}

export interface GenericRepository {
  list(params: ListParams): Promise<{ items: any[]; total: number }>
  findById(id: string): Promise<any | null>
  create(data: any): Promise<any>
  update(id: string, data: any): Promise<any>
  delete(id: string): Promise<void>
  existsByField(field: string, value: any, excludeId?: string): Promise<boolean>
}
