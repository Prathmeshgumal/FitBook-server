"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  Building2,
  Users,
  CreditCard,
  IndianRupee,
  AlertTriangle,
  RefreshCw,
  Dumbbell,
  MapPin,
  Search,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Sparkles,
  AlertCircle,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts"

// Types
interface DashboardStats {
  totals: {
    gyms: number
    members: number
    activeMemberships: number
    revenue: number
    expiringSoon: number
  }
  gymsByType: Array<{ gym_type: string; count: number }>
  membersByGender: Array<{ gender: string; count: number }>
  recentGyms: Array<{
    id: string
    name: string
    city: string
    state: string
    gym_type: string
    created_at: string
  }>
  monthlySignups: Array<{ month: string; count: number }>
  popularPlans: Array<{ name: string; price: number; subscription_count: number }>
}

interface Gym {
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

interface GymListResponse {
  gyms: Gym[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Utilities
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
  if (num >= 1000) return (num / 1000).toFixed(1) + "K"
  return num.toString()
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// API fetcher
const API_BASE = "/api/v1"

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`)
  if (!res.ok) throw new Error("Failed to fetch data")
  const json = await res.json()
  if (!json.success) throw new Error(json.error || "Unknown error")
  return json.data
}

// Chart colors
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

const GENDER_COLORS: Record<string, string> = {
  male: "hsl(var(--chart-2))",
  female: "hsl(var(--chart-5))",
  other: "hsl(var(--chart-3))",
}

// Components
function StatCard({
  title,
  value,
  description,
  icon: Icon,
  className = "",
}: {
  title: string
  value: string | number
  description?: string
  icon: React.ElementType
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

function StatsOverview({
  stats,
  isLoading,
}: {
  stats?: DashboardStats
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const totals = stats?.totals

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <StatCard
        title="Total Gyms"
        value={formatNumber(totals?.gyms || 0)}
        description="Gyms onboarded"
        icon={Building2}
      />
      <StatCard
        title="Total Members"
        value={formatNumber(totals?.members || 0)}
        description="Active members"
        icon={Users}
      />
      <StatCard
        title="Active Memberships"
        value={formatNumber(totals?.activeMemberships || 0)}
        description="Current subscriptions"
        icon={CreditCard}
      />
      <StatCard
        title="Total Revenue"
        value={formatCurrency(totals?.revenue || 0)}
        description="All-time earnings"
        icon={IndianRupee}
      />
      <StatCard
        title="Expiring Soon"
        value={formatNumber(totals?.expiringSoon || 0)}
        description="In next 7 days"
        icon={AlertTriangle}
        className={
          totals?.expiringSoon && totals.expiringSoon > 0
            ? "border-orange-500/50"
            : ""
        }
      />
    </div>
  )
}

function MemberGrowthChart({
  data,
  isLoading,
}: {
  data?: Array<{ month: string; count: number }>
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const chartData =
    data?.map((item) => ({
      month: new Date(item.month).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      members: parseInt(String(item.count)),
    })) || []

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Member Growth</CardTitle>
          <CardDescription>New signups over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[250px] items-center justify-center">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Member Growth</CardTitle>
        <CardDescription>New signups over the last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--chart-1))"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--chart-1))"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Area
              type="monotone"
              dataKey="members"
              stroke="hsl(var(--chart-1))"
              fillOpacity={1}
              fill="url(#colorMembers)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function GymTypeChart({
  data,
  isLoading,
}: {
  data?: Array<{ gym_type: string; count: number }>
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const chartData =
    data?.map((item) => ({
      name: item.gym_type,
      value: parseInt(String(item.count)),
    })) || []

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gyms by Type</CardTitle>
          <CardDescription>Distribution of gym categories</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[250px] items-center justify-center">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gyms by Type</CardTitle>
        <CardDescription>Distribution of gym categories</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) =>
                `${name} (${(percent * 100).toFixed(0)}%)`
              }
              labelLine={false}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function GenderDistributionChart({
  data,
  isLoading,
}: {
  data?: Array<{ gender: string; count: number }>
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const chartData =
    data?.map((item) => ({
      gender: item.gender.charAt(0).toUpperCase() + item.gender.slice(1),
      count: parseInt(String(item.count)),
      fill: GENDER_COLORS[item.gender] || "hsl(var(--chart-1))",
    })) || []

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gender Distribution</CardTitle>
          <CardDescription>Member demographics breakdown</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[250px] items-center justify-center">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gender Distribution</CardTitle>
        <CardDescription>Member demographics breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              dataKey="gender"
              type="category"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function RecentGyms({
  data,
  isLoading,
}: {
  data?: DashboardStats["recentGyms"]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Gyms</CardTitle>
          <CardDescription>Latest onboarded gyms</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground">No gyms onboarded yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Recent Gyms
        </CardTitle>
        <CardDescription>Latest onboarded gyms</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px]">
          <div className="space-y-4">
            {data.map((gym) => (
              <div
                key={gym.id}
                className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <Avatar className="h-10 w-10 bg-primary/10">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {gym.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{gym.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {gym.city}, {gym.state}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {gym.gym_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(gym.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function PopularPlans({
  data,
  isLoading,
}: {
  data?: DashboardStats["popularPlans"]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Popular Plans</CardTitle>
          <CardDescription>Top membership plans by subscriptions</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-muted-foreground">No plans available</p>
        </CardContent>
      </Card>
    )
  }

  const maxCount = Math.max(
    ...data.map((p) => parseInt(String(p.subscription_count)))
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Popular Plans
        </CardTitle>
        <CardDescription>Top membership plans by subscriptions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {data.map((plan, index) => {
            const count = parseInt(String(plan.subscription_count))
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {index + 1}
                    </span>
                    <span className="font-medium">{plan.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(plan.price)}</p>
                    <p className="text-xs text-muted-foreground">
                      {count} subscription{count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function GymsTable() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")

  const params = new URLSearchParams({ page: page.toString(), limit: "10" })
  if (search) params.append("search", search)

  const { data, error, isLoading } = useSWR<GymListResponse>(
    `/dashboard/gyms?${params}`,
    fetcher
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Gyms</CardTitle>
          <CardDescription>Complete list of onboarded gyms</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <p className="text-red-500">Failed to load gyms data</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              All Gyms
            </CardTitle>
            <CardDescription>
              {data?.pagination.total || 0} total gyms onboarded
            </CardDescription>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search gyms..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-10 w-64 rounded-lg border bg-background pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Search
            </button>
          </form>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-lg border p-4"
              >
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : data?.gyms.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-muted-foreground">No gyms found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.gyms.map((gym) => (
              <div
                key={gym.id}
                className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary">
                  {gym.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{gym.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {gym.city}, {gym.state}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="secondary">{gym.gym_type}</Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {gym.member_count} members
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(gym.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {data && data.pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(data.pagination.totalPages, p + 1))
                }
                disabled={page === data.pagination.totalPages}
                className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Main Dashboard Page
export default function DashboardPage() {
  const {
    data: stats,
    error,
    isLoading,
    mutate,
  } = useSWR<DashboardStats>("/dashboard/stats", fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  })
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await mutate()
    setIsRefreshing(false)
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Dumbbell className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">FitBook</h1>
                <p className="text-xs text-muted-foreground">
                  Gym Management Dashboard
                </p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold">Failed to Load Dashboard</h2>
            <p className="text-muted-foreground">
              Unable to connect to the backend server. Please make sure the API
              is running.
            </p>
            <button
              onClick={handleRefresh}
              className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">FitBook</h1>
              <p className="text-xs text-muted-foreground">
                Gym Management Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="gyms" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                All Gyms
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <section>
                <h2 className="mb-4 text-lg font-semibold">Key Metrics</h2>
                <StatsOverview stats={stats} isLoading={isLoading} />
              </section>

              <Separator />

              <section>
                <h2 className="mb-4 text-lg font-semibold">Analytics</h2>
                <div className="grid gap-6 lg:grid-cols-2">
                  <MemberGrowthChart
                    data={stats?.monthlySignups}
                    isLoading={isLoading}
                  />
                  <GymTypeChart
                    data={stats?.gymsByType}
                    isLoading={isLoading}
                  />
                </div>
              </section>

              <section>
                <div className="grid gap-6 lg:grid-cols-3">
                  <GenderDistributionChart
                    data={stats?.membersByGender}
                    isLoading={isLoading}
                  />
                  <PopularPlans
                    data={stats?.popularPlans}
                    isLoading={isLoading}
                  />
                  <RecentGyms
                    data={stats?.recentGyms}
                    isLoading={isLoading}
                  />
                </div>
              </section>
            </TabsContent>

            <TabsContent value="gyms">
              <GymsTable />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="container mx-auto flex items-center justify-center px-4">
          <p className="text-sm text-muted-foreground">
            FitBook Dashboard - Gym Management System
          </p>
        </div>
      </footer>
    </div>
  )
}
