"use client"
import Link from "next/link"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { Bus, Shield, Bell, Users, MapPin, MessageSquare, CheckCircle, ChevronRight, Home, Calendar, FileText, GraduationCap, Heart, ArrowRight, Sun as SunIcon, Clock, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-black dark:text-white">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-black dark:bg-white rounded-lg flex items-center justify-center">
              <Bus className="h-5 w-5 text-white dark:text-black" />
            </div>
            <span className="text-xl font-bold">Carity</span>
          </div>
          <div className="flex items-center gap-4">
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <SunIcon className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Moon className="h-5 w-5 text-gray-500" />
                )}
              </button>
            )}
            <Link href="/login">
              <Button variant="secondary">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-black text-white py-24 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-8">
            <CheckCircle className="h-4 w-4" />
            <span>School Transport Management Platform</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Safe, Smart,<br />School Transport
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10">
            Carity streamlines every aspect of school transport — from pupil registration to live tracking, AI-assisted parent support, and complete administrative control.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100 text-base px-8">
                Register as Parent
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary" className="border-white text-white hover:bg-white/10 text-base px-8">
                Admin Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
              A complete platform covering every aspect of school transport management.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "Capacity Management",
                desc: "Enforce seat limits automatically. Get waitlist management and instant overcrowding prevention.",
              },
              {
                icon: MapPin,
                title: "Live GPS Tracking",
                desc: "Real-time vehicle tracking for parents. Know exactly where your child's transport is.",
              },
              {
                icon: Bell,
                title: "Smart Notifications",
                desc: "Automated SMS, email, and in-app alerts for pickups, drops, cancellations, and changes.",
              },
              {
                icon: MessageSquare,
                title: "AI Chatbot Support",
                desc: "24/7 AI assistant answers parent queries about schedules, drivers, and absences.",
              },
              {
                icon: Users,
                title: "Role-Based Access",
                desc: "Fine-grained permissions for admins, schedulers, operations staff, drivers, and parents.",
              },
              {
                icon: Bus,
                title: "Fleet Management",
                desc: "Track vehicles, drivers, licences, insurance, and MOT certificates — with expiry alerts.",
              },
            ].map((feature, i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-md transition-shadow bg-white dark:bg-gray-900">
                <div className="w-11 h-11 bg-black dark:bg-white rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-white dark:text-black" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-24 px-6 bg-gray-50 dark:bg-gray-800 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Built for every role</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { role: "Super Admin", desc: "Full platform control, role management, system configuration." },
              { role: "Admin", desc: "Manage parents, pupils, vehicles, drivers, and schedules." },
              { role: "Scheduler", desc: "Create and manage transport routes, assign vehicles and drivers." },
              { role: "Operations", desc: "Assign pupils to seats, manage vehicle capacity." },
              { role: "Driver", desc: "View assigned routes, manifest, and mark attendance." },
              { role: "Parent", desc: "Register children, track transport, report absences, chat with AI." },
            ].map((r, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="inline-flex items-center bg-black text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
                  {r.role}
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Careers Section */}
      <section className="py-20 px-6 bg-[#faf8f5] dark:bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 0% 0%, rgba(20,94,99,0.08) 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, rgba(224,116,86,0.06) 0%, transparent 50%)'
        }} />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold tracking-widest uppercase text-[#e07456] bg-[#e07456]/10 px-3.5 py-1.5 rounded-full mb-4">
              Join Our Team
            </span>
            <h2 className="text-4xl font-bold text-[#0d3b3f] dark:text-white mb-3">
              Build a meaningful career in <span className="italic text-[#e07456]">care</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              We&apos;re hiring across five teams. Whether you&apos;re driving, scheduling, supporting pupils or running operations — there&apos;s a place for you at Carity.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
            {[
              { title: "Operations", sub: "Senior · Office", icon: Home, gradient: "from-[#20969e] to-[#155e63]" },
              { title: "Drivers", sub: "PT / FT · Field", icon: Bus, gradient: "from-[#e07456] to-[#f4a989]" },
              { title: "Scheduler", sub: "Full-time · Office", icon: Calendar, gradient: "from-indigo-500 to-indigo-400" },
              { title: "Admin", sub: "Full-time · Office", icon: FileText, gradient: "from-violet-500 to-violet-400" },
              { title: "Pupil Carer", sub: "Term-time · School", icon: GraduationCap, gradient: "from-pink-500 to-pink-400" },
            ].map((role, i) => (
              <Link
                key={i}
                href="/careers"
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 text-center flex flex-col items-center hover:-translate-y-1 hover:border-[#20969e] hover:shadow-lg transition-all duration-200"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center mb-3`}>
                  <role.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-[#0d3b3f] dark:text-white text-sm">{role.title}</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mt-0.5">{role.sub}</p>
              </Link>
            ))}
          </div>

          <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d3b3f] to-[#155e63] text-white relative">
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#20969e] via-[#e07456] to-[#20969e]" />
            <div className="grid md:grid-cols-2 gap-10 p-8 md:p-10">
              <div>
                <h3 className="text-2xl font-bold mb-3">Why work with Carity?</h3>
                <p className="text-[#d4f0f2] mb-6 leading-relaxed">
                  Joining Carity means becoming part of a team that takes care seriously — and takes care of each other. We invest in our people, support development, and create a culture where every role matters.
                </p>
                <Link
                  href="/careers"
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-[#e07456] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#e07456]/35 hover:bg-[#c95f44] hover:-translate-y-0.5 transition-all duration-200"
                >
                  View All Openings & Apply
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: SunIcon, title: "Career Growth", desc: "Funded training, qualifications and clear progression paths." },
                  { icon: MessageSquare, title: "Real Support", desc: "Approachable management, regular supervision and open communication." },
                  { icon: Clock, title: "Flexible Hours", desc: "Patterns that work around school runs, studies and family." },
                  { icon: Heart, title: "Meaningful Work", desc: "Be part of changing someone's day — every single day." },
                ].map((perk, i) => (
                  <div key={i} className="bg-white/[0.06] border border-white/[0.12] rounded-xl p-4">
                    <div className="w-8 h-8 bg-[#e07456]/20 rounded-lg flex items-center justify-center mb-2.5">
                      <perk.icon className="h-4 w-4 text-[#f4a989]" />
                    </div>
                    <h4 className="text-sm font-semibold mb-1">{perk.title}</h4>
                    <p className="text-xs text-[#d4f0f2] leading-snug">{perk.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-gray-400 mb-8">
            Join Carity today and modernise your school transport operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100">
                Register as Parent
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary" className="border-white text-white hover:bg-white/10">
                Admin Login
              </Button>
            </Link>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-6">
            Demo: admin@carity.com / password123 &bull; parent@carity.com / password123
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 px-6 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-black dark:bg-white rounded-md flex items-center justify-center">
              <Bus className="h-4 w-4 text-white dark:text-black" />
            </div>
            <span className="font-bold">Carity</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">&copy; 2024 Carity. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
