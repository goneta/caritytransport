import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/providers/session-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "react-hot-toast"
import PwaProvider from "@/components/pwa/pwa-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Carity — School Transport Management",
  description: "Streamline school transport operations with Carity",
  applicationName: "Carity Transport",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Carity Transport",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#111827",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
        <SessionProvider>
          {children}
          <PwaProvider />
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
