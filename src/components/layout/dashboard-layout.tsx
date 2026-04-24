import Sidebar from "./sidebar"
import Topbar from "./topbar"
import ChatWidget from "@/components/shared/chat-widget"

export default function DashboardLayout({
  children,
  title,
}: {
  children: React.ReactNode
  title?: string
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Sidebar />
      <Topbar title={title} />
      <main className="lg:pl-64 pt-16">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
      <ChatWidget />
    </div>
  )
}
