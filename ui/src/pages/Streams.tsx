import { useStreams } from "@/api/queries"
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
import { Database, Layers, Search, RefreshCw, Activity, Inbox } from "lucide-react"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { toast } from "sonner"
import Avatar from "boring-avatars"

export function Streams() {
  const { data: streams, isLoading: rawLoading, refetch, isFetching } = useStreams()
  const [search, setSearch] = useState("")
  const navigate = useNavigate()

  // Include isFetching so loading state shows when returning to tab with stale data
  const isLoading = useMinLoadingDuration(rawLoading || isFetching)
  const isRefreshing = isFetching && !rawLoading

  const handleRefresh = async () => {
    try {
      await refetch()
      toast.success("Streams updated")
    } catch (error) {
      toast.error("Failed to refresh streams")
    }
  }

  const filteredStreams = streams?.filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Redis Streams</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitoring {streams?.length || 0} active ingestion points
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading} className="gap-2 w-fit">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatsCard
          title="Total Streams"
          value={streams?.length || 0}
          icon={Layers}
        />
        <StatsCard
          title="Total Messages"
          value={formatNumber(streams?.reduce((acc: number, s: any) => acc + s.length, 0) || 0)}
          icon={Activity}
        />
      </div>

      {/* Search and Table */}
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter streams by name..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {(!filteredStreams || filteredStreams.length === 0) ? (
          <EmptyState
            icon={Inbox}
            title={search ? "No streams match your search" : "No streams found"}
            description={search ? "Try adjusting your search query." : "No active Redis streams are being monitored."}
            action={search ? { label: "Clear search", onClick: () => setSearch("") } : undefined}
          />
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[35%]">Stream Name</TableHead>
                  <TableHead className="text-right w-[15%]">Messages</TableHead>
                  <TableHead className="text-right w-[15%] hidden sm:table-cell">Memory</TableHead>
                  <TableHead className="text-right w-[15%] hidden md:table-cell">Last Activity</TableHead>
                  <TableHead className="text-right w-[20%] hidden lg:table-cell pr-6">Last Entry ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStreams?.map((stream: any) => (
                  <TableRow
                    key={stream.name}
                    className="group cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate({ to: '/streams/$name', params: { name: stream.name } })}
                  >
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-3">
                        <Avatar
                          size={24}
                          name={stream.name}
                          variant="beam"
                          colors={["#14b8a6", "#06b6d4", "#8b5cf6", "#ec4899", "#f97316"]}
                        />
                        {stream.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(stream.length)}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">
                        {formatBytes(stream.memory_bytes)}
                      </span>
                    </TableCell>
                    <TableCell
                      className="text-right text-muted-foreground text-sm hidden md:table-cell"
                      title={stream.last_activity ? formatFullDate(stream.last_activity) : undefined}
                    >
                      {stream.last_activity ? formatRelativeTime(stream.last_activity) : 'Never'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground hidden lg:table-cell pr-6">
                      {stream.last_entry_id || '-'}
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
