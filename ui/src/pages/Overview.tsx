import { useOverview, useStreams } from "@/api/queries"
import { useMinLoadingDuration } from "@/hooks/useMinLoadingDuration"
import { StatsCard } from "@/components/StatsCard"
import { EmptyState } from "@/components/EmptyState"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatBytes, formatNumber, formatRelativeTime, formatFullDate } from "@/lib/utils"
import { Activity, Layers, RefreshCw, Inbox } from "lucide-react"
import { useNavigate } from "@tanstack/react-router"
import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function Overview() {
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview, isFetching: overviewFetching } = useOverview()
  const { data: streams, isLoading: streamsLoading, refetch: refetchStreams, isFetching: streamsFetching } = useStreams()
  const navigate = useNavigate()

  const isRefreshing = (overviewFetching && !overviewLoading) || (streamsFetching && !streamsLoading)

  // Include isFetching so loading state shows when returning to tab with stale data
  const rawLoading = overviewLoading || streamsLoading || overviewFetching || streamsFetching
  const isLoading = useMinLoadingDuration(rawLoading)

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchOverview(), refetchStreams()])
      toast.success("Dashboard refreshed")
    } catch (error) {
      toast.error("Failed to refresh dashboard")
    }
  }

  // Determine system health based on DLQ messages
  const dlqCount = overview?.total_dlq_messages || 0
  const isHealthy = dlqCount === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isHealthy ? 'bg-success' : 'bg-error'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isHealthy ? 'bg-success' : 'bg-error'}`}></span>
            </span>
            {isHealthy ? 'Everything is healthy' : 'DLQ needs attention'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isHealthy
              ? 'Real-time status of your Watermill streams'
              : `${formatNumber(dlqCount)} failed message${dlqCount > 1 ? 's' : ''} awaiting action`
            }
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading} className="gap-2 w-fit">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Messages"
          value={formatNumber(overview?.total_messages || 0)}
          icon={Activity}
          description="Processed across all streams"
        />
        <StatsCard
          title="Active Streams"
          value={overview?.total_streams || 0}
          icon={Layers}
          description="Monitored in Redis"
        />
        <StatsCard
          title="Dead Letter Queue"
          value={overview?.total_dlq_messages || 0}
          icon={Inbox}
          description="Messages awaiting action"
        />
      </div>

      {/* Streams Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Active Streams</h2>
          <Link to="/streams" className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </div>

        {(!streams || streams.length === 0) ? (
          <EmptyState
            icon={Inbox}
            title="No streams found"
            description="No active Redis streams are being monitored. Start publishing messages to see them here."
          />
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[8%] text-center">Status</TableHead>
                  <TableHead className="w-[35%]">Stream Name</TableHead>
                  <TableHead className="text-right w-[17%]">Messages</TableHead>
                  <TableHead className="text-right w-[15%] hidden sm:table-cell">Memory</TableHead>
                  <TableHead className="text-right w-[18%] hidden md:table-cell pr-4">Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {streams?.slice(0, 5).map((stream: any) => (
                  <TableRow
                    key={stream.name}
                    className="group cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate({ to: '/streams/$name', params: { name: stream.name } })}
                  >
                    <TableCell className="text-center">
                      <div className="h-2 w-2 rounded-full bg-success mx-auto" />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{stream.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(stream.length)}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">
                        {formatBytes(stream.memory_bytes)}
                      </span>
                    </TableCell>
                    <TableCell
                      className="text-right text-muted-foreground text-sm hidden md:table-cell pr-6"
                      title={stream.last_activity ? formatFullDate(stream.last_activity) : undefined}
                    >
                      {stream.last_activity ? formatRelativeTime(stream.last_activity) : 'Never'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
