"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Bus, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import toast from "react-hot-toast"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result = await signIn("credentials", {
      email,
      password,
      twoFactorCode,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      toast.error("Invalid credentials or two-factor code")
    } else {
      const res = await fetch("/api/auth/session")
      const session = await res.json()
      const role = session?.user?.role

      if (["SUPER_ADMIN", "ADMIN", "SCHEDULER", "OPERATIONS"].includes(role)) {
        router.push("/admin")
      } else if (role === "DRIVER") {
        router.push("/driver")
      } else {
        router.push("/parent")
      }
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center">
              <Bus className="h-6 w-6 text-white dark:text-black" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">Carity</span>
          </Link>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Sign in to your account</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="twoFactorCode">Two-factor or recovery code</Label>
              <Input
                id="twoFactorCode"
                type="text"
                value={twoFactorCode}
                onChange={e => setTwoFactorCode(e.target.value)}
                placeholder="Optional unless enabled"
                autoComplete="one-time-code"
                className="font-mono"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">Required for admin or driver accounts that have two-factor authentication enabled.</p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Signing in...</> : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-gray-900 dark:text-white hover:underline">
                Register as Parent
              </Link>
            </p>
          </div>

          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Demo accounts:</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Admin: admin@carity.com</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Parent: parent@carity.com</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Driver: james.driver@carity.com</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Password: password123</p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
          <Link href="/" className="hover:underline">\u2190 Back to home</Link>
        </p>
      </div>
    </div>
  )
}
