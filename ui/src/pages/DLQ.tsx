import { useDLQStats, useDLQMessages, useRequeueMessage, useRequeueAll, useDeleteDLQMessage } from "@/api/queries"
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
import { formatNumber, formatTimestamp } from "@/lib/utils"
import { AlertCircle, RefreshCw, Trash2, ChevronDown, ChevronRight, RotateCcw, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { JsonViewer } from "@/components/JsonViewer"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"

export function DLQ() {
  const { data: stats, isLoading: statsLoading, refetch: refetchStats, isFetching: statsFetching } = useDLQStats()
  const [opts, setOpts] = useState({ limit: 50, order: 'desc' as const })
  const { data: messageList, isLoading: messagesLoading, refetch: refetchMessages, isFetching: messagesFetching } = useDLQMessages(opts)

  const isRefreshing = (statsFetching && !statsLoading) || (messagesFetching && !messagesLoading)

  const requeueMutation = useRequeueMessage()
  const requeueAllMutation = useRequeueAll()
  const deleteMutation = useDeleteDLQMessage()

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [editingMsg, setEditingMsg] = useState<any>(null)
  const [editedPayload, setEditedPayload] = useState("")

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchStats(), refetchMessages()])
      toast.success("DLQ refreshed")
    } catch (error) {
      toast.error("Failed to refresh DLQ")
    }
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

  const handleRequeue = async (id: string, payload?: any) => {
    try {
      await requeueMutation.mutateAsync({ id, payload })
      toast.success('Message requeued successfully')
      handleRefresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleRequeueAll = async () => {
    if (!confirm('Are you sure you want to requeue all messages?')) return
    try {
      const res = await requeueAllMutation.mutateAsync()
      toast.success(`Requeued ${res.requeued} messages`)
      handleRefresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Message deleted')
      handleRefresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const openRequeueModal = (msg: any) => {
    setEditingMsg(msg)
    setEditedPayload(JSON.stringify(msg.payload, null, 2))
  }

  const saveAndRequeue = async () => {
    try {
      const payload = JSON.parse(editedPayload)
      await handleRequeue(editingMsg.id, payload)
      setEditingMsg(null)
    } catch (err: any) {
      toast.error('Invalid JSON payload')
    }
  }

  // Include isFetching so loading state shows when returning to tab with stale data
  const rawLoading = statsLoading || messagesLoading || statsFetching || messagesFetching
  const isLoading = useMinLoadingDuration(rawLoading)

  const messageCount = messageList?.messages?.length || 0
  const hasMessages = messageCount > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dead Letter Queue</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Investigate and requeue failed messages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="default"
            size="sm"
            className="gap-2"
            disabled={!hasMessages}
            onClick={handleRequeueAll}
          >
            <RotateCcw className="h-4 w-4" />
            Requeue All
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatsCard
          title="Failed Messages"
          value={formatNumber(messageCount)}
          icon={Inbox}
        />
        <StatsCard
          title="Last Activity"
          value={stats?.last_activity ? formatTimestamp(stats.last_activity) : "Never"}
          icon={RotateCcw}
        />
      </div>

      {/* Messages Section */}
      <div className="space-y-4">

        {(!messageList || messageList.messages.length === 0) ? (
          <EmptyState
            icon={Inbox}
            title="No failed messages"
            description="The dead letter queue is empty. All messages have been processed successfully."
          />
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[5%]"></TableHead>
                  <TableHead className="w-[35%]">Source Stream</TableHead>
                  <TableHead className="hidden sm:table-cell w-[30%]">Time Failed</TableHead>
                  <TableHead className="text-right w-[20%] pr-6">Actions</TableHead>
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
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{msg.original_topic}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs hidden sm:table-cell">
                        {formatTimestamp(msg.timestamp)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation()
                              handleDelete(msg.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation()
                              handleRequeue(msg.id)
                            }}
                          >
                            <RotateCcw className="h-4 w-4 text-primary" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedIds.has(msg.id) && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={4} className="p-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message ID</span>
                                <div className="font-mono bg-muted p-2.5 rounded-md text-sm truncate">{msg.id}</div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Original Topic</span>
                                <div className="font-mono bg-muted p-2.5 rounded-md text-sm">{msg.original_topic}</div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payload Content</span>
                                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => openRequeueModal(msg)}>
                                  Edit and Requeue
                                </Button>
                              </div>
                              <JsonViewer data={msg.payload} />
                            </div>
                            <div className="space-y-2">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Error Log</span>
                              <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md text-xs text-destructive font-mono whitespace-pre-wrap">
                                {msg.error}
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                              <Button variant="outline" size="sm" onClick={() => handleDelete(msg.id)}>
                                Delete Message
                              </Button>
                              <Button size="sm" className="gap-2" onClick={() => handleRequeue(msg.id)}>
                                <RotateCcw className="h-4 w-4" />
                                Requeue Message
                              </Button>
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
      </div>

      {/* Requeue Modal */}
      <Dialog open={!!editingMsg} onOpenChange={(open) => !open && setEditingMsg(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Requeue message?
            </DialogTitle>
            <DialogDescription>
              This will move the message back to <code className="text-primary font-mono">{editingMsg?.original_topic}</code> for reprocessing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message ID</label>
              <div className="font-mono bg-muted p-2.5 rounded-md text-sm">{editingMsg?.id}</div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payload (Editable JSON)</label>
              <textarea
                className="w-full min-h-[250px] bg-muted/50 border rounded-md p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                value={editedPayload}
                onChange={(e) => setEditedPayload(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMsg(null)}>Cancel</Button>
            <Button onClick={saveAndRequeue} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Requeue Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
