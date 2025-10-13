import { useMutation, UseMutationOptions, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query'

const baseUrl = '/api/crud'

interface Pagination<T> {
  data: T[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

export function useFetchItems<T>(
  model: string,
  params: Record<string, any>,
  signal?: AbortSignal,
  options?: UseQueryOptions<Pagination<T>, Error>
) {
  return useQuery<Pagination<T>, Error>({
    queryKey: [model, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams(params).toString()
      const controller = new AbortController()
      if (signal) signal.addEventListener('abort', () => controller.abort())
      const res = await fetch(`${baseUrl}/${model}?${searchParams}`, { signal: controller.signal })
      if (!res.ok) throw new Error('Error fetching data')
      return res.json()
    },
    enabled: !!model,
    ...options,
  })
}

export function useCreateItem<T>(model: string, options?: UseMutationOptions<{ data: T }, Error, T>) {
  const qc = useQueryClient()
  return useMutation<{ data: T }, Error, T>({
    mutationFn: async (data: T) => {
      const res = await fetch(`${baseUrl}/${model}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Error creating item')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [model] }),
    ...options,
  })
}

export function useUpdateItem<T>(model: string, options?: UseMutationOptions<{ data: T }, Error, { id: string; data: T }>) {
  const qc = useQueryClient()
  return useMutation<{ data: T }, Error, { id: string; data: T }>({
    mutationFn: async ({ id, data }) => {
      const res = await fetch(`${baseUrl}/${model}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Error updating item')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [model] }),
    ...options,
  })
}

export function useDeleteItem(model: string, options?: UseMutationOptions<any, Error, string>) {
  const qc = useQueryClient()
  return useMutation<any, Error, string>({
    mutationFn: async (id: string) => {
      const res = await fetch(`${baseUrl}/${model}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error deleting item')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [model] }),
    ...options,
  })
}
