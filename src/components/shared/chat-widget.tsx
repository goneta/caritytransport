"use client"
import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { MessageSquare, X, Send, Loader2, Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: string
  content: string
  createdAt?: string
}

const QUICK_ACTIONS: Record<string, string[]> = {
  PARENT: ["Pickup time?", "Who's my driver?", "Book a seat", "Report absence"],
  DRIVER: ["My routes", "Passenger list", "My vehicle", "Report issue"],
  ADMIN: ["Platform overview", "Available routes", "Pending applications", "Company info"],
  SUPER_ADMIN: ["Platform overview", "Available routes", "Pending applications", "Company info"],
  OPERATIONS: ["Platform overview", "Available routes", "Driver info", "Vehicle status"],
  SCHEDULER: ["Available routes", "Route capacity", "Schedule overview", "Company info"],
  DEFAULT: ["Available routes", "About Carity", "Job opportunities", "Contact info"],
}

export default function ChatWidget() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const role = (session?.user as any)?.role || 'DEFAULT'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (open && session?.user?.id && messages.length === 0) {
      setLoadingHistory(true)
      fetch(`/api/chat?userId=${session.user.id}`)
        .then(r => r.json())
        .then(d => {
          if (Array.isArray(d) && d.length > 0) {
            setMessages(d)
          } else {
            setMessages([{
              id: 'welcome',
              role: 'ASSISTANT',
              content: getWelcomeContent(role, session?.user?.name || ''),
            }])
          }
          setLoadingHistory(false)
        })
        .catch(() => setLoadingHistory(false))
    }
  }, [open, session?.user?.id])

  // Show for all authenticated users
  if (!session) return null

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || loading || !session?.user?.id) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'USER',
      content: input.trim(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content, userId: session.user.id }),
      })
      const data = await res.json()

      const assistantMessage: Message = {
        id: Date.now().toString() + '_assistant',
        role: 'ASSISTANT',
        content: data.message || 'Sorry, I could not process that request.',
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '_error',
        role: 'ASSISTANT',
        content: 'Sorry, I encountered an error. Please try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const formatContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('- ')) {
        const formatted = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        return <p key={i} className="ml-3 before:content-['•'] before:mr-2" dangerouslySetInnerHTML={{ __html: formatted }} />
      }
      if (line.startsWith('**') && line.endsWith('**')) return <strong key={i} className="block">{line.slice(2, -2)}</strong>
      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      return <p key={i} dangerouslySetInnerHTML={{ __html: formatted || '&nbsp;' }} />
    })
  }

  const quickActions = QUICK_ACTIONS[role] || QUICK_ACTIONS.DEFAULT

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all z-50",
          "bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        )}
        aria-label="Toggle AI Chat"
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className={cn(
          "fixed bottom-24 right-6 w-96 max-h-[600px] rounded-2xl shadow-2xl border z-50 flex flex-col",
          "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700",
          "sm:w-96 w-[calc(100vw-1.5rem)] right-3 sm:right-6"
        )}>
          {/* Header */}
          <div className="bg-black dark:bg-gray-800 text-white rounded-t-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Carity Assistant</p>
              <p className="text-xs text-gray-300 dark:text-gray-400">AI-powered support</p>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto hover:bg-white/10 p-1 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 max-h-[400px]">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" />
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex items-start gap-2.5",
                    msg.role === 'USER' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    msg.role === 'USER'
                      ? "bg-black dark:bg-white text-white dark:text-black"
                      : "bg-gray-100 dark:bg-gray-800"
                  )}>
                    {msg.role === 'USER'
                      ? <User className="h-4 w-4" />
                      : <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                  </div>
                  <div className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm space-y-0.5",
                    msg.role === 'USER'
                      ? "bg-black dark:bg-white text-white dark:text-black rounded-tr-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm"
                  )}>
                    {formatContent(msg.content)}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-4 pb-2">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {quickActions.map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="flex-shrink-0 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-4 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                disabled={loading}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage() }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

function getWelcomeContent(role: string, name: string): string {
  const firstName = name?.split(' ')[0] || 'there'

  if (role === 'PARENT') {
    return `Hello ${firstName}! I'm your Carity transport assistant. I can help you with:\n\n- Pickup times and schedules\n- Driver and vehicle information\n- Booking a seat for your child\n- Reporting absences\n- Company info and careers\n\nWhat can I help you with today?`
  }

  if (role === 'DRIVER') {
    return `Hello ${firstName}! I'm your Carity assistant. I can help you with:\n\n- Your assigned routes and schedules\n- Passenger manifests\n- Vehicle information\n- Company info and support\n\nWhat do you need?`
  }

  if (['ADMIN', 'SUPER_ADMIN', 'OPERATIONS', 'SCHEDULER'].includes(role)) {
    return `Hello ${firstName}! I'm the Carity platform assistant. I can help you with:\n\n- Platform overview and statistics\n- Route and schedule information\n- Driver and vehicle details\n- Recruitment and applications\n- Company info\n\nHow can I assist you?`
  }

  return `Hello ${firstName}! I'm the Carity assistant. I can help with transport routes, bookings, company information, and career opportunities. What would you like to know?`
}
