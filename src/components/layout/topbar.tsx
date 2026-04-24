"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import { Bell, Settings, Moon, Sun } from "lucide-react"

export default function Topbar({ title }: { title?: string }) {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const role = (session?.user as any)?.role || ''
  const image = (session?.user as any)?.image as string | null | undefined

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (session?.user?.id) {
      const notifPath = role === 'PARENT' ? '/api/parent/notifications' : '/api/admin/notifications'
      fetch(`${notifPath}?userId=${session.user.id}`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setUnreadCount(data.filter((n: any) => !n.read).length)
          }
        })
        .catch(() => {})
    }
  }, [session, role])

  const notifHref = role === 'PARENT' ? '/parent/notifications' : '/admin/notifications'

  const settingsHref =
    role === 'DRIVER' ? '/driver/settings' :
    role === 'PUPIL'  ? '/pupil/settings'  :
    role === 'PARENT' ? '/parent/settings' :
    '/admin/settings'

  const initials = session?.user?.name
    ? session.user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 z-30 h-16">
      <div className="flex items-center justify-between h-full px-4 lg:px-8">
        <div className="pl-12 lg:pl-0">
          {title && <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>}
        </div>

        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-yellow-500" />
              ) : (
                <Moon className="h-5 w-5 text-gray-500" />
              )}
            </button>
          )}

          {/* Notifications bell */}
          <Link href={notifHref} className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md" title="Notifications">
            <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Settings shortcut */}
          <Link href={settingsHref} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md" title="Profile & Settings">
            <Settings className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </Link>

          {/* Avatar + name */}
          <Link href={settingsHref} className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-2 py-1 transition-colors">
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 flex-shrink-0 bg-slate-800 flex items-center justify-center">
              {image ? (
                <img
                  src={image}
                  alt={session?.user?.name ?? 'Avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-xs font-bold">{initials}</span>
              )}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium leading-tight text-gray-900 dark:text-white">{session?.user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{role}</p>
            </div>
          </Link>
        </div>
      </div>
    </header>
  )
}
