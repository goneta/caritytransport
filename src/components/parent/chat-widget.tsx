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

export default function ChatWidget() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const role = (session?.user as any)?.role

  // Only show for parents
  if (!session || role !== 'PARENT') return null

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => { scrollToBottom() }, [messages])

  useEffect(() => {
    if (open && session?.user?.id && messages.length === 0) {
      setLoadingHistory(true)
      fetch(`/api/chat?userId=${session.user.id}`)
        .then(r => r.json())
        .then(d => {
          if (Array.isArray(d) && d.length > 0) {
            setMessages(d)
          } else {
            // Show welcome message
            setMessages([{
              id: 'welcome',
              role: 'ASSISTANT',
              content: `Hello! 👋 I'm your Carity transport assistant. I can help you with:\n\n• Pickup times and schedules\n• Driver information\n• Reporting absences\n• Adding children\n• Route status updates\n\nWhat can I help you with today?`,
            }])
          }
          setLoadingHistory(false)
        })
        .catch(() => setLoadingHistory(false))
    }
  }, [open, session?.user?.id])

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
      if (line.startsWith('•')) return <p key={i} className="ml-2">{line}</p>
      if (line.startsWith('**') && line.endsWith('**')) return <strong key={i}>{line.slice(2, -2)}</strong>
      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      return <p key={i} dangerouslySetInnerHTML={{ __html: formatted || '&nbsp;' }} />
    })
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-800 transition-colors z-50"
        aria-label="Toggle AI Chat"
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className={cn(
          "fixed bottom-24 right-6 w-96 max-h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col",
          "sm:w-96 w-[calc(100vw-1.5rem)] right-3 sm:right-6"
        )}>
          {/* Header */}
          <div className="bg-black text-white rounded-t-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Carity Assistant</p>
              <p className="text-xs text-gray-300">24/7 transport support</p>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto hover:bg-white/10 p-1 rounded">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 max-h-[400px]">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
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
                    msg.role === 'USER' ? "bg-black text-white" : "bg-gray-100"
                  )}>
                    {msg.role === 'USER'
                      ? <User className="h-4 w-4" />
                      : <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                  </div>
                  <div className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm space-y-0.5",
                    msg.role === 'USER'
                      ? "bg-black text-white rounded-tr-sm"
                      : "bg-gray-100 text-gray-800 rounded-tl-sm"
                  )}>
                    {formatContent(msg.content)}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-4 pb-2">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {["Pickup time?", "Who's my driver?", "Report absence", "Add a child"].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="flex-shrink-0 text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-4 pt-2 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black"
                disabled={loading}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage() }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
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
