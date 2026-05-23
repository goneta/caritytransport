"use client"
import Image from "next/image"
import Link from "next/link"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import { Bus, Shield, CheckCircle, ChevronRight, Home, Calendar, FileText, GraduationCap, Heart, ArrowRight, Sun as SunIcon, Clock, Moon, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const transportSteps = [
    {
      icon: Home,
      title: "Home pickup",
      text: "Students are collected from agreed home addresses or approved nearby pickup points, with routes planned around school start times.",
    },
    {
      icon: Bus,
      title: "School arrival",
      text: "Drivers follow assigned manifests and bring students to school entrances with a calm, organised handover at the start of the day.",
    },
    {
      icon: GraduationCap,
      title: "Afternoon return",
      text: "After school, students are checked onto the correct vehicle and returned safely to their homes or authorised drop-off locations.",
    },
  ]

  const safetyMeasures = [
    "Student manifests confirm who should be onboard for every journey.",
    "Drivers and transport teams follow planned routes, pickup windows, and school handover points.",
    "Parents can use platform updates to stay informed about bookings, trips, changes, and messages.",
    "Incident, attendance, and guardian verification tools support safer daily operations.",
  ]

  const scheduleItems = [
    { time: "Morning", label: "Pickup windows are planned around distance, route order, and school opening times." },
    { time: "School day", label: "Operations teams monitor attendance, route progress, and any required changes." },
    { time: "Afternoon", label: "Drop-off schedules are sequenced so students return home on the correct vehicle." },
    { time: "Updates", label: "Parents and staff receive schedule changes through the same transport workflow." },
  ]

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
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
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
      <section className="bg-[#0d3b3f] text-white px-6 py-16 md:py-20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[0.92fr_1.08fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-7 bg-white/5">
              <CheckCircle className="h-4 w-4 text-[#f4a989]" />
              <span>Planned school transport for every journey</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Safe journeys from home to school and back
            </h1>
            <p className="text-lg md:text-xl text-[#d4f0f2] max-w-2xl mb-9 leading-relaxed">
              Carity helps families and transport teams coordinate daily student pickup, school drop-off, supervised travel, and the return journey home.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-white text-black hover:bg-gray-100 text-base px-8">
                  Register as Parent
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="secondary" className="border-white text-black hover:bg-gray-100 text-base px-8">
                  Admin Login
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-2xl">
            <Image
              src="/student-transport-school-dropoff.jpg"
              alt="Students boarding a school bus outside school"
              width={1168}
              height={784}
              priority
              className="h-[360px] md:h-[520px] w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Transport Flow */}
      <section className="py-24 px-6 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[0.88fr_1.12fr] gap-12 items-center">
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900">
              <Image
                src="/student-transport-electric-bus.jpg"
                alt="Electric bus ready for a student transport route"
                width={1168}
                height={784}
                className="h-[320px] md:h-[500px] w-full object-cover"
              />
            </div>
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-[#155e63] dark:text-[#7ddce1] bg-[#20969e]/10 px-3.5 py-1.5 rounded-full mb-4">
                Daily route flow
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mb-5 text-[#0d3b3f] dark:text-white">
                How student transportation works
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 leading-relaxed">
                Each trip is planned around the student, the home address, the school timetable, and the route order. The goal is simple: a predictable journey for families and a clear workflow for staff.
              </p>
              <div className="grid gap-4">
                {transportSteps.map((step) => (
                  <div key={step.title} className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 bg-white dark:bg-gray-900">
                    <div className="flex gap-4">
                      <div className="w-11 h-11 bg-[#0d3b3f] dark:bg-white rounded-lg flex items-center justify-center shrink-0">
                        <step.icon className="h-5 w-5 text-white dark:text-[#0d3b3f]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{step.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{step.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Safety */}
      <section className="py-24 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-[#e07456] bg-[#e07456]/10 px-3.5 py-1.5 rounded-full mb-4">
                Supervised travel
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mb-5 text-[#0d3b3f] dark:text-white">
                Safety checks support every pickup and drop-off
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 leading-relaxed">
                Student transport depends on clear supervision, accurate records, and steady communication between families, drivers, schools, and operations teams.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {safetyMeasures.map((measure) => (
                  <div key={measure} className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                    <Shield className="h-5 w-5 text-[#e07456] mb-3" />
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{measure}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
              <Image
                src="/student-transport-safety-features.png"
                alt="School bus safety illustration with supervision and safety signs"
                width={1404}
                height={1125}
                className="h-[320px] md:h-[520px] w-full object-contain bg-white"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Scheduling */}
      <section className="py-24 px-6 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[1.02fr_0.98fr] gap-12 items-center">
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900">
              <Image
                src="/student-transport-school-dropoff.jpg"
                alt="School bus waiting at the school for planned student drop-off"
                width={1168}
                height={784}
                className="h-[320px] md:h-[500px] w-full object-cover"
              />
            </div>
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-[#155e63] dark:text-[#7ddce1] bg-[#20969e]/10 px-3.5 py-1.5 rounded-full mb-4">
                Planned schedules
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mb-5 text-[#0d3b3f] dark:text-white">
                Pickup and drop-off times are planned before the route starts
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 leading-relaxed">
                Carity keeps the day structured by connecting bookings, assigned pupils, vehicles, drivers, route plans, and family updates in one workflow.
              </p>
              <div className="grid gap-3">
                {scheduleItems.map((item) => (
                  <div key={item.time} className="flex gap-4 border-b border-gray-200 dark:border-gray-800 pb-4 last:border-0">
                    <div className="w-24 shrink-0">
                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#0d3b3f] dark:text-white">
                        <Clock className="h-4 w-4 text-[#e07456]" />
                        {item.time}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button size="lg" className="bg-[#0d3b3f] hover:bg-[#155e63] text-white">
                    Plan a Journey
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="secondary">
                    Manage Schedules
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Careers Section */}
      <section className="py-20 px-6 bg-[#faf8f5] dark:bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at 0% 0%, rgba(20,94,99,0.08) 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, rgba(224,116,86,0.06) 0%, transparent 50%)"
        }} />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold tracking-widest uppercase text-[#e07456] bg-[#e07456]/10 px-3.5 py-1.5 rounded-full mb-4">
              Join Our Team
            </span>
            <h2 className="text-4xl font-bold text-[#0d3b3f] dark:text-white mb-3">
              Build a meaningful career in <span className="italic text-[#e07456]">School transportation</span>
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
      <section className="py-24 px-6 bg-[#0d3b3f] text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to plan a safer school journey?</h2>
          <p className="text-[#d4f0f2] mb-8">
            Register as a parent or sign in to manage student pickup, drop-off, supervision, and schedules.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100">
                Register as Parent
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary" className="border-white text-black hover:bg-gray-100">
                Admin Login
              </Button>
            </Link>
          </div>
          <p className="text-[#d4f0f2]/70 text-sm mt-6">
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
