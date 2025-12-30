import { useParams } from "@tanstack/react-router"
import { useStream, useStreamMessages, useDeleteStreamMessage } from "@/api/queries"
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
import { formatBytes, formatNumber, formatTimestamp } from "@/lib/utils"
import { Database, Layers, ArrowLeft, RefreshCw, Trash2, ChevronDown, ChevronRight, Hash, Clock, Inbox } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { JsonViewer } from "@/components/JsonViewer"
import { toast } from "sonner"

export function StreamDetail() {
  const { name } = useParams({ from: '/streams/$name' })
  const { data: stream, isLoading: streamLoading, refetch: refetchStream } = useStream(name)
  const [opts, setOpts] = useState({ limit: 50, order: 'desc' as const })
  const { data: messageList, isLoading: messagesLoading, refetch: refetchMessages } = useStreamMessages(name, opts)
  const deleteMutation = useDeleteStreamMessage()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const handleRefresh = () => {
    refetchStream()
    refetchMessages()
  }

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return
    try {
      await deleteMutation.mutateAsync({ name, id })
      toast.success('Message deleted')
      refetchMessages()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (streamLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        Loading stream details...
      </div>
    )
  }

  if (!stream) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-xl font-bold mb-2">Stream not found</h2>
        <p className="text-muted-foreground mb-4">The stream "{name}" doesn't exist or has been deleted.</p>
        <Button variant="outline" asChild>
          <Link to="/streams">← Back to streams</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Link to="/streams">
            <Button variant="ghost" size="icon" className="mt-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight font-mono">{stream.name}</h1>
              <Badge variant="success">ACTIVE</Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Stream activity and message history
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2 w-fit">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Messages"
          value={formatNumber(stream.length)}
          icon={Layers}
        />
        <StatsCard
          title="Memory Usage"
          value={formatBytes(stream.memory_bytes)}
          icon={Database}
        />
        <StatsCard
          title="First Entry"
          value={stream.first_entry_id || '-'}
          icon={Hash}
        />
        <StatsCard
          title="Last Entry"
          value={stream.last_entry_id || '-'}
          icon={Clock}
        />
      </div>

      {/* Messages Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Messages</h2>
          <p className="text-sm text-muted-foreground">
            Showing last {messageList?.messages.length || 0} of {formatNumber(stream.length)}
          </p>
        </div>

        {(!messageList || messageList.messages.length === 0) ? (
          <EmptyState
            icon={Inbox}
            title="No messages"
            description="This stream doesn't have any messages yet. Messages will appear here once published."
          />
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Message ID</TableHead>
                  <TableHead className="hidden sm:table-cell">Timestamp</TableHead>
                  <TableHead className="hidden md:table-cell">Payload Preview</TableHead>
                  <TableHead className="text-right w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messageList?.messages.map((msg: any) => (
                  <>
                    <TableRow
                      key={msg.id}
                      className="cursor-pointer group"
                      onClick={() => toggleExpand(msg.id)}
                    >
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          {expandedIds.has(msg.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{msg.id}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-xs hidden sm:table-cell">
                        {formatTimestamp(msg.timestamp)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate font-mono text-xs text-muted-foreground hidden md:table-cell">
                        {JSON.stringify(msg.payload)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation()
                            handleDelete(msg.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedIds.has(msg.id) && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={5} className="p-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message ID</span>
                                <div className="font-mono bg-muted p-2.5 rounded-md text-sm">{msg.id}</div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timestamp</span>
                                <div className="font-mono bg-muted p-2.5 rounded-md text-sm">{msg.timestamp}</div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payload Content</span>
                              <JsonViewer data={msg.payload} />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {messageList?.has_more && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setOpts(prev => ({ ...prev, cursor: messageList.next_cursor }))}
            >
              Load More Messages
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
