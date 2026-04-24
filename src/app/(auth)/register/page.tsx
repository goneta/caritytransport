"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Bus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import toast from "react-hot-toast"

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    phone: "", address: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          address: form.address,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Registration failed")
      } else {
        toast.success("Registration successful! Redirecting to login...")
        setTimeout(() => router.push("/login"), 2000)
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center">
              <Bus className="h-6 w-6 text-white dark:text-black" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">Carity</span>
          </Link>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Create your parent account</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name *</Label>
              <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Jane Smith" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address *</Label>
              <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="jane@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+44 7700 900000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Home address</Label>
              <Input id="address" name="address" value={form.address} onChange={handleChange} placeholder="123 Main Street, London" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min. 8 characters" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password *</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="Repeat password" required />
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Creating account...</> : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-gray-900 dark:text-white hover:underline">Sign in</Link>
            </p>
          </div>

          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              \u2139\ufe0f After registering, an administrator may need to approve your account before you can access all features.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
