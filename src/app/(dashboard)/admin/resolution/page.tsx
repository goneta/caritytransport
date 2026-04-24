'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  MessageSquare,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  ArrowLeft,
  FileText,
  User,
  Filter,
  PoundSterling
} from 'lucide-react'
import DashboardLayout from '@/components/layout/dashboard-layout'

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
  user: { name: string; email: string; phone: string | null }
  booking: {
    id: string
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

export default function AdminResolutionPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Admin actions
  const [newStatus, setNewStatus] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [replyMessage, setReplyMessage] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => { fetchTickets() }, [statusFilter, typeFilter])

  async function fetchTickets() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('type', typeFilter)
      const res = await fetch(`/api/admin/resolution?${params}`)
      const data = await res.json()
      setTickets(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  async function updateTicket() {
    if (!selectedTicket || !newStatus) return
    setUpdating(true)
    try {
      const res = await fetch('/api/admin/resolution', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTicket.id,
          status: newStatus,
          adminNotes: adminNotes || undefined,
          message: replyMessage || undefined,
          refundAmount: refundAmount ? parseFloat(refundAmount) : undefined
        })
      })
      if (res.ok) {
        // Refresh ticket
        const ticketRes = await fetch(`/api/admin/resolution?`)
        const allTickets = await ticketRes.json()
        const updated = allTickets.find((t: Ticket) => t.id === selectedTicket.id)
        if (updated) setSelectedTicket(updated)
        setNewStatus('')
        setAdminNotes('')
        setReplyMessage('')
        setRefundAmount('')
        fetchTickets()
      }
    } finally {
      setUpdating(false)
    }
  }

  const stats = {
    open: tickets.filter(t => t.status === 'OPEN').length,
    review: tickets.filter(t => t.status === 'UNDER_REVIEW').length,
    resolved: tickets.filter(t => t.status === 'RESOLVED').length,
    rejected: tickets.filter(t => t.status === 'REJECTED').length
  }

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
          <CardHeader>
            <CardTitle className="text-base">Ticket Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Submitted By</p>
                <p className="font-medium">{selectedTicket.user.name}</p>
                <p className="text-slate-400">{selectedTicket.user.email}</p>
                {selectedTicket.user.phone && (
                  <a href={`tel:${selectedTicket.user.phone}`} className="text-blue-600 text-xs">
                    {selectedTicket.user.phone}
                  </a>
                )}
              </div>
              <div>
                <p className="text-slate-500">Type</p>
                <p className="font-medium">{TYPE_LABELS[selectedTicket.ticketType]}</p>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Submitted</p>
                <p className="font-medium">
                  {new Date(selectedTicket.createdAt).toLocaleDateString('en-GB', { dateStyle: 'full' })}
                </p>
              </div>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Description</p>
              <p className="text-sm bg-slate-50 p-3 rounded-lg">{selectedTicket.description}</p>
            </div>
            {selectedTicket.booking && (
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Related Booking</p>
                <div className="bg-slate-50 p-3 rounded-lg">
                  {selectedTicket.booking.items.map((item, i) => (
                    <p key={i} className="text-sm">
                      {item.schedule.routeName} — {item.pupil.fullName}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
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
                        {reply.isAdmin ? `🛡️ ${reply.user.name} (Support)` : `👤 ${reply.user.name} (Parent)`}
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
          </CardContent>
        </Card>

        {/* Admin Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Update Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select new status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">🔵 Open</SelectItem>
                  <SelectItem value="UNDER_REVIEW">🟡 Under Review</SelectItem>
                  <SelectItem value="RESOLVED">🟢 Resolved</SelectItem>
                  <SelectItem value="REJECTED">🔴 Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reply to Parent</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Type a message to the parent..."
                  value={replyMessage}
                  onChange={e => setReplyMessage(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Admin Notes (internal)</Label>
              <textarea
                className="w-full border rounded-lg p-2 text-sm min-h-16 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                placeholder="Internal notes (not visible to parent)..."
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
              />
            </div>

            {newStatus === 'RESOLVED' && selectedTicket.ticketType === 'REFUND_REQUEST' && (
              <div>
                <Label>Refund Amount (£)</Label>
                <div className="relative mt-1">
                  <PoundSterling className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-8"
                    placeholder="0.00"
                    value={refundAmount}
                    onChange={e => setRefundAmount(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button
              onClick={updateTicket}
              disabled={updating || !newStatus}
              className="w-full"
            >
              {updating ? 'Updating...' : 'Update Ticket'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <DashboardLayout title="Resolution Centre">
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Resolution Centre</h1>
        <p className="text-slate-500">Manage parent support tickets and refund requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('')}>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Tickets</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{tickets.length}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md border-blue-200" onClick={() => setStatusFilter('OPEN')}>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Open</p>
            <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md border-yellow-200" onClick={() => setStatusFilter('UNDER_REVIEW')}>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Under Review</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.review}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md border-green-200" onClick={() => setStatusFilter('RESOLVED')}>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Resolved</p>
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <div className="flex gap-2">
          {['', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-4">
          {['', 'REFUND_REQUEST', 'SERVICE_COMPLAINT', 'OTHER'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === t ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t ? TYPE_LABELS[t] : 'All Types'}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500 dark:text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No tickets found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <Card
              key={ticket.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedTicket(ticket)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm font-bold text-slate-600 dark:text-slate-400">{ticket.ticketNumber}</span>
                      <Badge className={STATUS_COLORS[ticket.status]}>
                        {ticket.status === 'OPEN' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {ticket.status === 'RESOLVED' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {ticket.status === 'REJECTED' && <XCircle className="w-3 h-3 mr-1" />}
                        {ticket.status.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-slate-400">{TYPE_LABELS[ticket.ticketType]}</span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-1 mb-1">{ticket.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {ticket.user.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ticket.createdAt).toLocaleDateString('en-GB')}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {ticket.replies.length} {ticket.replies.length === 1 ? 'reply' : 'replies'}
                      </span>
                      {ticket.refundProcessed && (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Refund: £{ticket.refundAmount?.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 ml-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </DashboardLayout>
  )
}
