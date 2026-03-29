import { useState } from "react"
import { useDashboardStats } from "@/hooks/useApi"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Header } from "./Header"
import { StatsOverview } from "./StatsOverview"
import { GymTypeChart } from "./GymTypeChart"
import { MemberGrowthChart } from "./MemberGrowthChart"
import { GenderDistributionChart } from "./GenderDistributionChart"
import { RecentGyms } from "./RecentGyms"
import { PopularPlans } from "./PopularPlans"
import { GymsTable } from "./GymsTable"
import { LayoutDashboard, Building2, AlertCircle } from "lucide-react"

export function Dashboard() {
  const { stats, isLoading, isError, mutate } = useDashboardStats()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await mutate()
    setIsRefreshing(false)
  }

  if (isError) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header onRefresh={handleRefresh} isRefreshing={isRefreshing} />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold">Failed to Load Dashboard</h2>
            <p className="text-muted-foreground">
              Unable to connect to the backend server. Please make sure the API is running.
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
      <Header onRefresh={handleRefresh} isRefreshing={isRefreshing} />
      
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
              {/* Stats Overview */}
              <section>
                <h2 className="mb-4 text-lg font-semibold">Key Metrics</h2>
                <StatsOverview stats={stats} isLoading={isLoading} />
              </section>

              <Separator />

              {/* Charts Grid */}
              <section>
                <h2 className="mb-4 text-lg font-semibold">Analytics</h2>
                <div className="grid gap-6 lg:grid-cols-2">
                  <MemberGrowthChart data={stats?.monthlySignups} isLoading={isLoading} />
                  <GymTypeChart data={stats?.gymsByType} isLoading={isLoading} />
                </div>
              </section>

              {/* Bottom Section */}
              <section>
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-1">
                    <GenderDistributionChart data={stats?.membersByGender} isLoading={isLoading} />
                  </div>
                  <div className="lg:col-span-1">
                    <PopularPlans data={stats?.popularPlans} isLoading={isLoading} />
                  </div>
                  <div className="lg:col-span-1">
                    <RecentGyms data={stats?.recentGyms} isLoading={isLoading} />
                  </div>
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
