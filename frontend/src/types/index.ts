export interface DashboardStats {
  totals: {
    gyms: number
    members: number
    activeMemberships: number
    revenue: number
    expiringSoon: number
  }
  gymsByType: Array<{
    gym_type: string
    count: number
  }>
  membersByGender: Array<{
    gender: string
    count: number
  }>
  recentGyms: Array<{
    id: string
    name: string
    city: string
    state: string
    gym_type: string
    created_at: string
  }>
  monthlySignups: Array<{
    month: string
    count: number
  }>
  popularPlans: Array<{
    name: string
    price: number
    subscription_count: number
  }>
}

export interface Gym {
  id: string
  name: string
  gym_type: string
  city: string
  state: string
  phone: string
  created_at: string
  member_count: number
  plan_count: number
}

export interface GymListResponse {
  gyms: Gym[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}
