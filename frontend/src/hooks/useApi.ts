import useSWR from 'swr'
import type { DashboardStats, GymListResponse, ApiResponse } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`)
  if (!res.ok) {
    throw new Error('Failed to fetch data')
  }
  const json: ApiResponse<T> = await res.json()
  if (!json.success) {
    throw new Error(json.error || 'Unknown error')
  }
  return json.data
}

export function useDashboardStats() {
  const { data, error, isLoading, mutate } = useSWR<DashboardStats>(
    '/dashboard/stats',
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  )

  return {
    stats: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useGymsList(page: number = 1, search?: string) {
  const params = new URLSearchParams({ page: page.toString(), limit: '10' })
  if (search) params.append('search', search)

  const { data, error, isLoading, mutate } = useSWR<GymListResponse>(
    `/dashboard/gyms?${params}`,
    fetcher,
    {
      revalidateOnFocus: true,
    }
  )

  return {
    data,
    isLoading,
    isError: error,
    mutate,
  }
}
