'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  MessageSquare,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  ArrowLeft,
  FileText
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Ticket {
  id: string
  ticketNumber: string
  ticketType: string
  description: string
  status: string
  adminNotes: string | null
  refundProcessed: boolean
  refundAmount: number | null
  resolvedAt: string | null
  createdAt: string
  booking: {
    items: Array<{
      schedule: { routeName: string }
      pupil: { fullName: string }
    }>
  } | null
  replies: Array<{
    id: string
    message: string
    isAdmin: boolean
    createdAt: string
    user: { name: string; role: string }
  }>
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700'
}

const TYPE_LABELS: Record<string, string> = {
  REFUND_REQUEST: '💰 Refund Request',
  SERVICE_COMPLAINT: '📢 Service Complaint',
  OTHER: '❓ Other'
}

export default function ResolutionCentrePage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  // New ticket form
  const [newTicketType, setNewTicketType] = useState('')
  const [newTicketDesc, setNewTicketDesc] = useState('')
  const [newTicketBookingId, setNewTicketBookingId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchTickets() }, [statusFilter])

  async function fetchTickets() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/parent/resolution?${params}`)
      const data = await res.json()
      setTickets(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function submitNewTicket() {
    if (!newTicketType || !newTicketDesc) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/parent/resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketType: newTicketType,
          description: newTicketDesc,
          bookingId: newTicketBookingId || undefined
        })
      })
      if (res.ok) {
        setShowNewTicket(false)
        setNewTicketType('')
        setNewTicketDesc('')
        setNewTicketBookingId('')
        fetchTickets()
      } else {
        const d = await res.json()
        alert(d.error || 'Failed to submit ticket')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function sendReply() {
    if (!replyText || !selectedTicket) return
    setSendingReply(true)
    try {
      const res = await fetch(`/api/parent/resolution/${selectedTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText })
      })
      if (res.ok) {
        setReplyText('')
        // Refresh ticket
        const ticketRes = await fetch(`/api/parent/resolution/${selectedTicket.id}`)
        const updated = await ticketRes.json()
        setSelectedTicket(updated)
        fetchTickets()
      }
    } finally {
      setSendingReply(false)
    }
  }

  if (loading && !selectedTicket) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  // Detail view
  if (selectedTicket) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setSelectedTicket(null)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedTicket.ticketNumber}</h2>
          <Badge className={STATUS_COLORS[selectedTicket.status]}>
            {selectedTicket.status.replace(/_/g, ' ')}
          </Badge>
        </div>

        {/* Ticket info */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Type</span>
              <span className="text-sm">{TYPE_LABELS[selectedTicket.ticketType]}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Description</span>
              <span className="text-sm text-right max-w-xs">{selectedTicket.description}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Submitted</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {new Date(selectedTicket.createdAt).toLocaleDateString('en-GB', {
                  dateStyle: 'full'
                })}
              </span>
            </div>
            {selectedTicket.booking && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-slate-600 mb-1">Related Booking</p>
                {selectedTicket.booking.items.map((item, i) => (
                  <p key={i} className="text-sm text-slate-500 dark:text-slate-400">
                    {item.schedule.routeName} — {item.pupil.fullName}
                  </p>
                ))}
              </div>
            )}
            {selectedTicket.adminNotes && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-slate-600 mb-1">Admin Notes</p>
                <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">{selectedTicket.adminNotes}</p>
              </div>
            )}
            {selectedTicket.refundProcessed && selectedTicket.refundAmount && (
              <div className="pt-2 border-t bg-green-50 rounded-lg p-3">
                <p className="text-sm font-medium text-green-700">
                  ✓ Refund Processed: £{selectedTicket.refundAmount.toFixed(2)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-4 h-4" /> Conversation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTicket.replies.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No messages yet</p>
            ) : (
              <div className="space-y-3 mb-4">
                {selectedTicket.replies.map(reply => (
                  <div
                    key={reply.id}
                    className={`p-3 rounded-lg ${
                      reply.isAdmin
                        ? 'bg-blue-50 border border-blue-100 ml-4'
                        : 'bg-slate-50 border mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${reply.isAdmin ? 'text-blue-700' : 'text-slate-600'}`}>
                        {reply.isAdmin ? '🛡️ Carity Support' : '👤 You'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(reply.createdAt).toLocaleString('en-GB', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{reply.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply input */}
            {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'REJECTED' && (
              <div className="border-t pt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                  />
                  <Button onClick={sendReply} disabled={sendingReply || !replyText}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <DashboardLayout title="Resolution Centre">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Resolution Centre</h1>
          <p className="text-slate-500">Raise refund requests and service complaints</p>
        </div>
        <Button onClick={() => setShowNewTicket(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Ticket
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'All Tickets', count: tickets.length, color: 'text-slate-900' },
          { label: 'Open', count: tickets.filter(t => t.status === 'OPEN').length, color: 'text-blue-600' },
          { label: 'Under Review', count: tickets.filter(t => t.status === 'UNDER_REVIEW').length, color: 'text-yellow-600' },
          { label: 'Resolved', count: tickets.filter(t => t.status === 'RESOLVED').length, color: 'text-green-600' }
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium">Filter by status:</Label>
        <div className="flex gap-2">
          {['', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket List */}
      <div className="space-y-3">
        {tickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500 dark:text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No tickets found</p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => setShowNewTicket(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Raise a ticket
              </Button>
            </CardContent>
          </Card>
        ) : (
          tickets.map(ticket => (
            <Card
              key={ticket.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedTicket(ticket)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm font-bold text-slate-600 dark:text-slate-400">
                        {ticket.ticketNumber}
                      </span>
                      <Badge className={STATUS_COLORS[ticket.status]}>
                        {ticket.status === 'OPEN' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {ticket.status === 'RESOLVED' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {ticket.status === 'REJECTED' && <XCircle className="w-3 h-3 mr-1" />}
                        {ticket.status.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {TYPE_LABELS[ticket.ticketType]}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2">{ticket.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ticket.createdAt).toLocaleDateString('en-GB')}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {ticket.replies.length} {ticket.replies.length === 1 ? 'reply' : 'replies'}
                      </span>
                      {ticket.refundProcessed && (
                        <span className="text-green-600">
                          ✓ Refund: £{ticket.refundAmount?.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 ml-4" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* New Ticket Dialog */}
      <Dialog open={showNewTicket} onOpenChange={setShowNewTicket}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Raise a Support Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Ticket Type</Label>
              <Select value={newTicketType} onValueChange={setNewTicketType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select ticket type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REFUND_REQUEST">💰 Refund Request</SelectItem>
                  <SelectItem value="SERVICE_COMPLAINT">📢 Service Complaint</SelectItem>
                  <SelectItem value="OTHER">❓ Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description</Label>
              <textarea
                className="w-full border rounded-lg p-2 text-sm min-h-28 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                placeholder="Please describe your issue in detail..."
                value={newTicketDesc}
                onChange={e => setNewTicketDesc(e.target.value)}
              />
            </div>

            {newTicketType === 'REFUND_REQUEST' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-medium mb-1">Refund Policy</p>
                <ul className="space-y-1 list-disc list-inside text-xs">
                  <li>Cancellations more than 5 hours before trip: automatic refund via standard cancellation</li>
                  <li>Exceptional circumstances (illness, service failure): raise a ticket here</li>
                  <li>Refunds are reviewed within 3-5 business days</li>
                </ul>
              </div>
            )}

            <div>
              <Label>Booking Reference (optional)</Label>
              <Input
                placeholder="Enter booking ID if applicable..."
                value={newTicketBookingId}
                onChange={e => setNewTicketBookingId(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowNewTicket(false)}>Cancel</Button>
              <Button
                onClick={submitNewTicket}
                disabled={submitting || !newTicketType || !newTicketDesc}
              >
                {submitting ? 'Submitting...' : 'Submit Ticket'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  )
}
