import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { Sparkles } from "lucide-react"

interface PopularPlansProps {
  data?: Array<{
    name: string
    price: number
    subscription_count: number
  }>
  isLoading: boolean
}

export function PopularPlans({ data, isLoading }: PopularPlansProps) {
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

  const maxCount = Math.max(...data.map(p => parseInt(String(p.subscription_count))))

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
                      {count} subscription{count !== 1 ? 's' : ''}
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
