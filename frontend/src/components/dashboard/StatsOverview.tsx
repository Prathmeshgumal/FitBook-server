import { Building2, Users, CreditCard, IndianRupee, AlertTriangle } from "lucide-react"
import { StatCard } from "./StatCard"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatNumber } from "@/lib/utils"
import type { DashboardStats } from "@/types"

interface StatsOverviewProps {
  stats?: DashboardStats
  isLoading: boolean
}

export function StatsOverview({ stats, isLoading }: StatsOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32 mt-2" />
          </div>
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
        className={totals?.expiringSoon && totals.expiringSoon > 0 ? "border-orange-500/50" : ""}
      />
    </div>
  )
}
