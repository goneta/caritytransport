import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/providers/session-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "react-hot-toast"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Carity — School Transport Management",
  description: "Streamline school transport operations with Carity",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
        <SessionProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#000', color: '#fff', borderRadius: '8px' },
              success: { style: { background: '#000', color: '#fff' } },
              error: { style: { background: '#dc2626', color: '#fff' } },
            }}
          />
        </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
