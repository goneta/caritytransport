"use client"

import { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MessageSquare, Send, Loader2, ShieldCheck, Car, Plus, Users } from "lucide-react"
import toast from "react-hot-toast"

type UserSummary = {
  id: string
  name: string | null
  email: string
  role: string
}

type Contact = UserSummary & {
  phone?: string | null
  context?: string
}

type Message = {
  id: string
  threadId: string
  senderId: string
  sanitizedContent: string
  status: string
  moderationReason?: string | null
  driverAutoReply: boolean
  createdAt: string
  sender: UserSummary
}

type Thread = {
  id: string
  subject: string
  status: string
  updatedAt: string
  participants: Array<{ userId: string; role: string; user: UserSummary }>
  messages: Message[]
  schedule?: { id: string; routeName: string; direction: string; departureTime: string } | null
}

function displayName(user: UserSummary) {
  return user.name || user.email
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })
}

export default function ModeratedChatPage({ title }: { title: string }) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [selectedContactId, setSelectedContactId] = useState("")
  const [subject, setSubject] = useState("Transport conversation")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [creating, setCreating] = useState(false)

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  )

  const loadThreads = async () => {
    const response = await fetch("/api/chat/threads")
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || "Failed to load conversations")
    setThreads(data.threads || [])
    if (!selectedThreadId && data.threads?.[0]?.id) setSelectedThreadId(data.threads[0].id)
  }

  const loadContacts = async () => {
    const response = await fetch("/api/chat/contacts")
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || "Failed to load contacts")
    setContacts(data.contacts || [])
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadThreads(), loadContacts()])
      .catch((error) => toast.error(error.message || "Chat could not be loaded"))
      .finally(() => setLoading(false))
  }, [])

  const loadMessages = async (threadId: string) => {
    setMessagesLoading(true)
    try {
      const response = await fetch(`/api/chat/threads/${threadId}/messages`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to load messages")
      setMessages(data.messages || [])
    } catch (error: any) {
      toast.error(error.message || "Messages could not be loaded")
    } finally {
      setMessagesLoading(false)
    }
  }

  useEffect(() => {
    if (selectedThreadId) loadMessages(selectedThreadId)
    else setMessages([])
  }, [selectedThreadId])

  const createThread = async () => {
    if (!selectedContactId) {
      toast.error("Select a contact to start a chat")
      return
    }
    setCreating(true)
    try {
      const response = await fetch("/api/chat/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: [selectedContactId], subject }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to create chat")
      setThreads((current) => [data.thread, ...current])
      setSelectedThreadId(data.thread.id)
      setSelectedContactId("")
      setSubject("Transport conversation")
      toast.success("Chat started")
    } catch (error: any) {
      toast.error(error.message || "Chat could not be created")
    } finally {
      setCreating(false)
    }
  }

  const sendMessage = async () => {
    if (!selectedThreadId || !message.trim()) return
    setSending(true)
    try {
      const response = await fetch(`/api/chat/threads/${selectedThreadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to send message")
      setMessage("")
      await loadMessages(selectedThreadId)
      await loadThreads()
      if (data.message?.status === "BLOCKED") toast.error("Message held for moderation")
      else if (data.message?.status === "FLAGGED") toast("Message sent and flagged for moderator review")
      else toast.success(data.autoRepliesCreated ? "Message sent. Driver auto-reply added." : "Message sent")
    } catch (error: any) {
      toast.error(error.message || "Message could not be sent")
    } finally {
      setSending(false)
    }
  }

  return (
    <DashboardLayout title={title}>
      <div className="space-y-6">
        <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-700 dark:text-blue-300 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-100">Moderated transport chat</p>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                Messages are logged for safeguarding. Drivers may receive and send an automatic safe-driving response while supervising a route.
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[360px_1fr] gap-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4" />Start a chat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="chat-subject">Subject</Label>
                  <Input id="chat-subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chat-contact">Contact</Label>
                  <select
                    id="chat-contact"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedContactId}
                    onChange={(event) => setSelectedContactId(event.target.value)}
                  >
                    <option value="">Select a contact</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {displayName(contact)} · {contact.role}{contact.context ? ` · ${contact.context}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <Button className="w-full" onClick={createThread} disabled={creating || !selectedContactId}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  Start conversation
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" />Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : threads.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No chats yet. Start one with an assigned contact or operations.</p>
                ) : (
                  <div className="space-y-2">
                    {threads.map((thread) => {
                      const lastMessage = thread.messages?.[0]
                      return (
                        <button
                          key={thread.id}
                          onClick={() => setSelectedThreadId(thread.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedThreadId === thread.id ? "border-black bg-gray-50 dark:bg-gray-900" : "hover:bg-gray-50 dark:hover:bg-gray-900"}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-sm truncate">{thread.subject}</p>
                            <Badge variant="secondary" className="text-[10px]">{thread.status}</Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {thread.participants.map((participant) => displayName(participant.user)).join(", ")}
                          </p>
                          {lastMessage && (
                            <p className="text-xs text-gray-500 mt-1 truncate">{lastMessage.sanitizedContent}</p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="min-h-[620px] flex flex-col">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4" />{selectedThread?.subject || "Select a conversation"}</span>
                {selectedThread?.schedule && <Badge variant="secondary">{selectedThread.schedule.routeName}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              {!selectedThreadId ? (
                <div className="flex-1 flex items-center justify-center text-sm text-gray-500">Choose or start a chat.</div>
              ) : messagesLoading ? (
                <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[460px]">
                  {messages.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-12">No messages yet. Send the first moderated message.</p>
                  ) : messages.map((item) => (
                    <div key={item.id} className="rounded-lg border p-3 bg-white dark:bg-gray-950">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{displayName(item.sender)}</p>
                          <Badge variant="outline" className="text-[10px]">{item.sender.role}</Badge>
                          {item.driverAutoReply && <Badge variant="secondary" className="text-[10px]"><Car className="h-3 w-3 mr-1" />Auto-reply</Badge>}
                          {item.status !== "VISIBLE" && item.status !== "AUTO_REPLY" && <Badge variant="destructive" className="text-[10px]">{item.status}</Badge>}
                        </div>
                        <span className="text-xs text-gray-400">{formatTime(item.createdAt)}</span>
                      </div>
                      <p className="text-sm mt-2 whitespace-pre-wrap">{item.sanitizedContent}</p>
                      {item.moderationReason && <p className="text-xs text-amber-600 mt-2">Moderator note: {item.moderationReason}</p>}
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t p-4 space-y-3">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  disabled={!selectedThreadId || sending}
                  placeholder="Write a safeguarding-friendly transport message..."
                  className="w-full min-h-[92px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  maxLength={2000}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">Messages may be flagged or held if unsafe content is detected.</p>
                  <Button onClick={sendMessage} disabled={!selectedThreadId || sending || !message.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
