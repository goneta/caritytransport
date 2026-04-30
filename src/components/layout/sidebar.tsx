"use client"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, GraduationCap, Car, Route, Bell,
  Settings, LogOut, Menu, X, Building2, School, CalendarDays,
  FileText, BarChart3, MessageSquare, UserCog, ChevronDown, Bus,
  MapPin, ShieldCheck, BookOpen, Briefcase, ShoppingCart, CreditCard,
  BookMarked, Search, AlertTriangle, History, Navigation, ScanLine,
  Headphones, CalendarRange
} from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles?: string[]
  children?: NavItem[]
}

const adminNavItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/admin/people", label: "People", icon: Users, children: [
      { href: "/admin/parents", label: "Parents", icon: Users },
      { href: "/admin/pupils", label: "Pupils", icon: GraduationCap },
      { href: "/admin/employees", label: "Employees", icon: Briefcase },
    ]
  },
  {
    href: "/admin/fleet", label: "Fleet", icon: Bus, children: [
      { href: "/admin/companies", label: "Companies", icon: Building2 },
      { href: "/admin/vehicles", label: "Vehicles", icon: Car },
      { href: "/admin/drivers", label: "Drivers", icon: UserCog },
      { href: "/admin/compliance", label: "Compliance", icon: ShieldCheck },
    ]
  },
  { href: "/admin/schools", label: "Schools", icon: School },
  {
    href: "/admin/scheduling", label: "Scheduling", icon: Route, children: [
      { href: "/admin/schedules", label: "Routes", icon: Route },
      { href: "/admin/holidays", label: "Holidays", icon: CalendarDays },
    ]
  },
  { href: "/admin/bookings", label: "Bookings", icon: CreditCard },
  { href: "/admin/unavailability", label: "Driver Unavailability", icon: AlertTriangle },
  { href: "/admin/resolution", label: "Resolution Centre", icon: Headphones },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/documents", label: "Documents", icon: FileText },
  { href: "/admin/careers", label: "Careers", icon: Briefcase },
  { href: "/admin/audit", label: "Audit Log", icon: ShieldCheck },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

const parentNavItems: NavItem[] = [
  { href: "/parent", label: "Dashboard", icon: LayoutDashboard },
  { href: "/parent/children", label: "My Children", icon: GraduationCap },
  { href: "/parent/book", label: "Book Transport", icon: Search },
  { href: "/parent/basket", label: "Basket", icon: ShoppingCart },
  { href: "/parent/payments", label: "Payments & Renewals", icon: CreditCard },
  { href: "/parent/bookings", label: "My Bookings", icon: BookMarked },
  { href: "/parent/history", label: "Trip History", icon: History },
  { href: "/parent/schedules", label: "Transport Schedule", icon: Route },
  { href: "/parent/tracking", label: "Live Tracking", icon: MapPin },
  { href: "/parent/resolution", label: "Resolution Centre", icon: Headphones },
  { href: "/parent/notifications", label: "Notifications", icon: Bell },
  { href: "/parent/settings", label: "Settings", icon: Settings },
]

const pupilNavItems: NavItem[] = [
  { href: "/pupil", label: "My Dashboard", icon: LayoutDashboard },
  { href: "/pupil/trips", label: "My Trips", icon: Navigation },
  { href: "/pupil/settings", label: "My Profile", icon: Settings },
]

const driverNavItems: NavItem[] = [
  { href: "/driver", label: "Dashboard", icon: LayoutDashboard },
  { href: "/driver/schedule", label: "My Schedule", icon: CalendarRange },
  { href: "/driver/scan", label: "QR Scanner", icon: ScanLine },
  { href: "/driver/trips", label: "Trip Log", icon: Navigation },
  { href: "/driver/route", label: "My Route", icon: Route },
  { href: "/driver/manifest", label: "Manifest", icon: BookOpen },
  { href: "/driver/attendance", label: "Attendance", icon: Users },
  { href: "/driver/settings", label: "Settings", icon: Settings },
]

export default function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const role = (session?.user as any)?.role || ''
  let navItems = parentNavItems
  if (['SUPER_ADMIN', 'ADMIN', 'SCHEDULER', 'OPERATIONS'].includes(role)) {
    navItems = adminNavItems
  } else if (role === 'DRIVER') {
    navItems = driverNavItems
  } else if (role === 'PUPIL') {
    navItems = pupilNavItems
  }

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev =>
      prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]
    )
  }

  const isActive = (href: string) => pathname === href
  const isParentActive = (item: NavItem) =>
    item.children?.some(c => pathname.startsWith(c.href)) || pathname.startsWith(item.href)

  const NavLink = ({ item, depth = 0 }: { item: NavItem; depth?: number }) => {
    const hasChildren = item.children && item.children.length > 0
    const expanded = expandedItems.includes(item.href)
    const active = isActive(item.href)
    const parentActive = isParentActive(item)

    if (hasChildren) {
      return (
        <div>
          <button
            onClick={() => toggleExpanded(item.href)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
              parentActive
                ? "bg-black text-white font-semibold"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <span className="flex items-center gap-3">
              <item.icon className="h-4 w-4" />
              {item.label}
            </span>
            <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
          </button>
          {expanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children!.map(child => (
                <NavLink key={child.href} item={child} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
          active
            ? "bg-black text-white font-semibold border-l-4 border-white"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
          depth > 0 && "pl-4"
        )}
      >
        <item.icon className="h-4 w-4" />
        {item.label}
      </Link>
    )
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-gray-200 dark:border-gray-800">
        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
          <Bus className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="text-xl font-bold text-black dark:text-white">Carity</span>
          <p className="text-xs text-gray-500 dark:text-gray-400">Transport Platform</p>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* User Info + Sign Out */}
      <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 flex-shrink-0 bg-slate-800 flex items-center justify-center">
            {(session?.user as any)?.image ? (
              <img
                src={(session?.user as any).image}
                alt={session?.user?.name ?? 'Avatar'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-xs font-bold">
                {session?.user?.name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-gray-900 dark:text-white">{session?.user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{role}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        "lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 z-50 transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 fixed left-0 top-0 bottom-0">
        <SidebarContent />
      </aside>
    </>
  )
}
