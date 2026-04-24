"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import {
  Bus, ChevronRight, CheckCircle, Users, Clock, Shield,
  TrendingUp, Heart, Truck, MapPin, Phone, Mail, Upload,
  Briefcase, GraduationCap, Star, ArrowRight, Menu, X,
  DollarSign, Calendar, FileText, Award, Coffee, Zap,
} from "lucide-react"

/* ───────────────────────── Data ───────────────────────── */

const ROLES = [
  { id: "operations", title: "Operations", label: "Operations Manager" },
  { id: "drivers", title: "Drivers", label: "School Bus Driver" },
  { id: "scheduler", title: "Scheduler", label: "Transport Coordinator" },
  { id: "admin", title: "Admin", label: "Administrative Assistant" },
  { id: "pupilcarer", title: "Pupil Carer", label: "Pupil Carer / Escort" },
]

const BENEFITS = [
  { icon: DollarSign, title: "Competitive Pay", desc: "We offer salaries above industry average with annual reviews and performance bonuses." },
  { icon: Clock, title: "Flexible Hours", desc: "Choose from full-time, part-time, and term-time-only schedules that fit your life." },
  { icon: GraduationCap, title: "Professional Training", desc: "Fully funded CPC, first-aid, safeguarding, and MIDAS training for all team members." },
  { icon: Users, title: "Team Culture", desc: "Join a supportive, close-knit team that celebrates diversity and collaboration." },
  { icon: TrendingUp, title: "Career Growth", desc: "Clear progression pathways from driver to supervisor, coordinator, and management." },
  { icon: Truck, title: "Transport Provided", desc: "Free staff shuttle to and from our depot so you never worry about your commute." },
]

const POSITIONS = [
  {
    role: "drivers",
    title: "School Bus Driver",
    type: "Full-time / Part-time",
    salary: "£28,000 – £35,000",
    location: "London & Surrounding Areas",
    desc: "Safely transport pupils to and from school on designated routes. Full UK driving licence (Category D) required. We provide PCV training for the right candidate.",
    tags: ["DBS Required", "PCV Licence", "Term-time"],
  },
  {
    role: "scheduler",
    title: "Transport Coordinator",
    type: "Full-time",
    salary: "£25,000 – £30,000",
    location: "Head Office, London",
    desc: "Plan and optimise daily routes and schedules. Liaise with schools, parents, and drivers to ensure smooth operations. Strong organisational skills essential.",
    tags: ["Office-based", "Route Planning", "Mon–Fri"],
  },
  {
    role: "operations",
    title: "Operations Manager",
    type: "Full-time",
    salary: "£35,000 – £45,000",
    location: "Head Office, London",
    desc: "Oversee the day-to-day running of our fleet. Manage driver teams, compliance, vehicle maintenance schedules, and client relationships.",
    tags: ["Leadership", "Fleet Management", "Compliance"],
  },
  {
    role: "pupilcarer",
    title: "Pupil Carer / Escort",
    type: "Part-time",
    salary: "£12 – £16 / hr",
    location: "London & Surrounding Areas",
    desc: "Accompany pupils with special educational needs on school transport. Provide care, reassurance, and ensure safe boarding and alighting.",
    tags: ["SEN Experience", "DBS Required", "Term-time"],
  },
  {
    role: "admin",
    title: "Administrative Assistant",
    type: "Full-time",
    salary: "£22,000 – £26,000",
    location: "Head Office, London",
    desc: "Support the operations team with bookings, invoicing, parent communication, and document management. Proficiency in Microsoft Office required.",
    tags: ["Office-based", "Customer Service", "Mon–Fri"],
  },
  {
    role: "drivers",
    title: "Part-Time Driver",
    type: "Part-time",
    salary: "£12 – £16 / hr",
    location: "London & Surrounding Areas",
    desc: "Drive morning or afternoon school runs on a part-time basis. Ideal for those seeking flexible, term-time work with competitive hourly pay.",
    tags: ["Flexible", "DBS Required", "Term-time"],
  },
]

const NAV_LINKS = [
  { label: "About", section: "about" },
  { label: "Benefits", section: "benefits" },
  { label: "Positions", section: "positions" },
  { label: "Apply", section: "apply" },
]

/* ───────────────────────── Component ───────────────────────── */

export default function CareersPage() {
  // Refs for smooth scroll
  const heroRef = useRef<HTMLDivElement>(null)
  const aboutRef = useRef<HTMLDivElement>(null)
  const benefitsRef = useRef<HTMLDivElement>(null)
  const positionsRef = useRef<HTMLDivElement>(null)
  const applyRef = useRef<HTMLDivElement>(null)

  const sectionRefs: Record<string, React.RefObject<HTMLDivElement | null>> = {
    hero: heroRef,
    about: aboutRef,
    benefits: benefitsRef,
    positions: positionsRef,
    apply: applyRef,
  }

  const scrollTo = (section: string) => {
    sectionRefs[section]?.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    setMobileMenuOpen(false)
  }

  // Mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Form state
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [formData, setFormData] = useState({
    title: "",
    firstName: "",
    middleNames: "",
    surname: "",
    email: "",
    mobile: "",
    landline: "",
    address: "",
    postCode: "",
    dateOfBirth: "",
    niNumber: "",
    nationality: "",
    religion: "",
    languages: "",
    nokName: "",
    nokAddress: "",
    nokTelephone: "",
    disability: "No",
    disabilityDetails: "",
    registeredDisabled: "No",
    medicalConditions: "",
    currentMedication: "",
    otherQualifications: "",
    criminalRecord: "",
    noCriminalRecord: "No",
    futureDisclosure: "Yes",
    leisureInterests: "",
    eoEthnicity: "",
    eoGender: "",
    eoAge: "",
    signatureName: "",
    signatureDate: "",
    agreeDeclaration: false,
  })

  // Employment history
  const [employmentHistory, setEmploymentHistory] = useState([
    { employer: "", jobTitle: "", from: "", to: "", duties: "", reasonLeaving: "" },
  ])

  // Academic history
  const [academicHistory, setAcademicHistory] = useState([
    { institution: "", qualification: "", from: "", to: "", grade: "" },
  ])

  // References
  const [references, setReferences] = useState([
    { name: "", position: "", company: "", phone: "", email: "", relationship: "" },
    { name: "", position: "", company: "", phone: "", email: "", relationship: "" },
  ])

  // Address history (for DBS)
  const [addressHistory, setAddressHistory] = useState([
    { address: "", from: "", to: "" },
  ])

  // Role-specific
  const [roleSpecificData, setRoleSpecificData] = useState<Record<string, any>>({})

  // Files
  const [files, setFiles] = useState<{ name: string; size: number; type: string; dataUrl: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [referenceCode, setReferenceCode] = useState("")
  const [error, setError] = useState("")

  // Active form step
  const [step, setStep] = useState(0)

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList) return
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        setFiles((prev) => [
          ...prev,
          { name: file.name, size: file.size, type: file.type, dataUrl: reader.result as string },
        ])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setError("")

    // Basic validation
    if (selectedRoles.length === 0) { setError("Please select at least one position."); return }
    if (!formData.firstName.trim()) { setError("First name is required."); return }
    if (!formData.surname.trim()) { setError("Surname is required."); return }
    if (!formData.email.trim()) { setError("Email is required."); return }
    if (!formData.agreeDeclaration) { setError("You must agree to the declaration to submit."); return }

    setSubmitting(true)
    try {
      const payload = {
        selectedRoles,
        formData: {
          ...formData,
          academicHistory,
          employmentHistory,
          references,
          addressHistory,
        },
        roleSpecificData,
        files,
      }

      const res = await fetch("/api/careers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to submit application")

      setReferenceCode(data.referenceCode)
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const STEPS = [
    "Select Positions",
    "Personal Details",
    "Medical & NOK",
    "Education",
    "Employment",
    "Role-specific",
    "DBS & Disclosure",
    "References",
    "Equal Opportunities",
    "Files & Declaration",
  ]

  /* ───────────────────────── Render ───────────────────────── */

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
              <Bus className="h-5 w-5 text-black" />
            </div>
            <span className="text-xl font-bold">Carity</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <button
                key={link.section}
                onClick={() => scrollTo(link.section)}
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                {link.label}
              </button>
            ))}
            <Link
              href="/login"
              className="text-sm bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Sign In
            </Link>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-black border-t border-white/10 px-6 py-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <button
                key={link.section}
                onClick={() => scrollTo(link.section)}
                className="block w-full text-left text-gray-300 hover:text-white py-2"
              >
                {link.label}
              </button>
            ))}
            <Link
              href="/login"
              className="block text-center bg-white text-black px-4 py-2 rounded-lg font-medium mt-2"
            >
              Sign In
            </Link>
          </div>
        )}
      </nav>

      {/* ─── Hero Section ─── */}
      <section ref={heroRef} className="pt-24 bg-black text-white">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-8">
            <Briefcase className="h-4 w-4" />
            <span>We&apos;re Hiring</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Join the Carity<br />Team
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10">
            Help us make school transport safer, smarter, and more reliable for thousands of families across the UK.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => scrollTo("positions")}
              className="inline-flex items-center justify-center gap-2 bg-white text-black px-8 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-base"
            >
              View Open Positions
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => scrollTo("apply")}
              className="inline-flex items-center justify-center gap-2 border border-white/30 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors text-base"
            >
              Apply Now
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── About Section ─── */}
      <section ref={aboutRef} className="py-24 px-6 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">About Carity</p>
              <h2 className="text-4xl font-bold mb-6 text-black dark:text-white">
                Making every school journey safe and dependable
              </h2>
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 text-lg mb-6 leading-relaxed">
                Carity is a technology-driven school transport management platform that connects schools, parents, and
                drivers through real-time tracking, smart scheduling, and seamless communication. We serve thousands of
                families across London and the surrounding areas.
              </p>
              <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 text-lg leading-relaxed">
                Our team is passionate about child safety and operational excellence. We&apos;re looking for dedicated
                individuals who share our commitment to providing the highest standard of school transport services.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "2,500+", label: "Pupils transported daily" },
                { value: "150+", label: "Schools served" },
                { value: "98%", label: "On-time record" },
                { value: "4.9/5", label: "Parent satisfaction" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 text-center"
                >
                  <p className="text-3xl font-bold text-black dark:text-white mb-1">{stat.value}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Benefits Section ─── */}
      <section ref={benefitsRef} className="py-24 px-6 bg-gray-50 dark:bg-gray-800 dark:bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Why Work With Us</p>
            <h2 className="text-4xl font-bold mb-4 text-black dark:text-white">Benefits & Perks</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
              We invest in our people because great service starts with a great team.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-8 hover:shadow-lg dark:hover:border-white/20 transition-all group"
              >
                <div className="w-12 h-12 bg-black dark:bg-white rounded-lg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <b.icon className="h-6 w-6 text-white dark:text-black" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-black dark:text-white">{b.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Positions Section ─── */}
      <section ref={positionsRef} className="py-24 px-6 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Open Positions</p>
            <h2 className="text-4xl font-bold mb-4 text-black dark:text-white">Find Your Role</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
              Explore our current vacancies and find the perfect fit for your skills and experience.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {POSITIONS.map((pos, i) => (
              <div
                key={i}
                className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 hover:shadow-lg dark:hover:border-white/20 transition-all flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-black dark:text-white">{pos.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{pos.type}</p>
                  </div>
                  <span className="text-xs font-medium bg-black dark:bg-white text-white dark:text-black px-3 py-1 rounded-full">
                    {pos.salary}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <MapPin className="h-4 w-4" />
                  {pos.location}
                </div>
                <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 text-sm leading-relaxed mb-4 flex-1">
                  {pos.desc}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {pos.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => {
                    if (!selectedRoles.includes(pos.role)) toggleRole(pos.role)
                    scrollTo("apply")
                  }}
                  className="w-full bg-black dark:bg-white text-white dark:text-black py-2.5 rounded-lg font-medium hover:opacity-80 transition-opacity text-sm"
                >
                  Apply for this role
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Application Form Section ─── */}
      <section ref={applyRef} className="py-24 px-6 bg-gray-50 dark:bg-gray-800 dark:bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Apply Now</p>
            <h2 className="text-4xl font-bold mb-4 text-black dark:text-white">Start Your Application</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
              Complete the form below to apply. All information is kept strictly confidential.
            </p>
          </div>

          {submitted ? (
            /* ── Success state ── */
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-black dark:text-white">Application Submitted!</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Thank you for your interest in joining Carity. We will review your application and get back to you soon.
              </p>
              <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 inline-block">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Your reference code</p>
                <p className="text-2xl font-mono font-bold text-black dark:text-white">{referenceCode}</p>
              </div>
              <p className="text-sm text-gray-400 mt-6">
                Please save this reference code for your records.
              </p>
            </div>
          ) : (
            /* ── Form ── */
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
              {/* Step indicator */}
              <div className="border-b border-gray-200 dark:border-white/10 px-6 py-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {STEPS.map((s, i) => (
                    <button
                      key={s}
                      onClick={() => setStep(i)}
                      className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                        i === step
                          ? "bg-black dark:bg-white text-white dark:text-black"
                          : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20"
                      }`}
                    >
                      {i + 1}. {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* ── Step 0: Select Positions ── */}
                {step === 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-black dark:text-white">Which position(s) are you applying for?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Select one or more roles below.</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {ROLES.map((role) => (
                        <button
                          key={role.id}
                          onClick={() => toggleRole(role.id)}
                          className={`text-left p-4 rounded-xl border-2 transition-all ${
                            selectedRoles.includes(role.id)
                              ? "border-black dark:border-white bg-black/5 dark:bg-white/10"
                              : "border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-black dark:text-white">{role.label}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{role.title} Department</p>
                            </div>
                            {selectedRoles.includes(role.id) && (
                              <CheckCircle className="h-5 w-5 text-black dark:text-white" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Step 1: Personal Details ── */}
                {step === 1 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-black dark:text-white">Personal Details</h3>
                    <div className="grid sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                        <select value={formData.title} onChange={(e) => updateField("title", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm">
                          <option value="">Select</option>
                          <option value="Mr">Mr</option><option value="Mrs">Mrs</option><option value="Miss">Miss</option><option value="Ms">Ms</option><option value="Dr">Dr</option><option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
                        <input type="text" value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" placeholder="First name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Middle Name(s)</label>
                        <input type="text" value={formData.middleNames} onChange={(e) => updateField("middleNames", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" placeholder="Middle name(s)" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Surname *</label>
                        <input type="text" value={formData.surname} onChange={(e) => updateField("surname", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" placeholder="Surname" />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address *</label>
                        <input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" placeholder="you@example.com" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mobile Number</label>
                        <input type="tel" value={formData.mobile} onChange={(e) => updateField("mobile", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" placeholder="07..." />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                      <textarea value={formData.address} onChange={(e) => updateField("address", e.target.value)} rows={2} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" placeholder="Full address" />
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Post Code</label>
                        <input type="text" value={formData.postCode} onChange={(e) => updateField("postCode", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                        <input type="date" value={formData.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">NI Number</label>
                        <input type="text" value={formData.niNumber} onChange={(e) => updateField("niNumber", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" placeholder="AB 12 34 56 C" />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nationality</label>
                        <input type="text" value={formData.nationality} onChange={(e) => updateField("nationality", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Religion</label>
                        <input type="text" value={formData.religion} onChange={(e) => updateField("religion", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Languages Spoken</label>
                        <input type="text" value={formData.languages} onChange={(e) => updateField("languages", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" placeholder="English, etc." />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Medical & Next of Kin ── */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-black dark:text-white mb-4">Next of Kin</h3>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                          <input type="text" value={formData.nokName} onChange={(e) => updateField("nokName", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                          <input type="text" value={formData.nokAddress} onChange={(e) => updateField("nokAddress", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telephone</label>
                          <input type="tel" value={formData.nokTelephone} onChange={(e) => updateField("nokTelephone", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-black dark:text-white mb-4">Medical History</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Do you have a disability?</label>
                          <select value={formData.disability} onChange={(e) => updateField("disability", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm">
                            <option value="No">No</option><option value="Yes">Yes</option><option value="Prefer not to say">Prefer not to say</option>
                          </select>
                        </div>
                        {formData.disability === "Yes" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Details</label>
                            <input type="text" value={formData.disabilityDetails} onChange={(e) => updateField("disabilityDetails", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                          </div>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Medical Conditions</label>
                          <textarea value={formData.medicalConditions} onChange={(e) => updateField("medicalConditions", e.target.value)} rows={2} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" placeholder="List any relevant conditions" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Medication</label>
                          <textarea value={formData.currentMedication} onChange={(e) => updateField("currentMedication", e.target.value)} rows={2} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" placeholder="List any medication" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 3: Education ── */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-black dark:text-white">Education & Qualifications</h3>
                      <button
                        onClick={() => setAcademicHistory([...academicHistory, { institution: "", qualification: "", from: "", to: "", grade: "" }])}
                        className="text-sm bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-lg font-medium hover:opacity-80"
                      >
                        + Add
                      </button>
                    </div>
                    {academicHistory.map((entry, idx) => (
                      <div key={idx} className="border border-gray-200 dark:border-white/10 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Entry {idx + 1}</p>
                          {academicHistory.length > 1 && (
                            <button onClick={() => setAcademicHistory(academicHistory.filter((_, i) => i !== idx))} className="text-red-500 text-xs hover:underline">Remove</button>
                          )}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <input type="text" placeholder="Institution" value={entry.institution} onChange={(e) => { const a = [...academicHistory]; a[idx].institution = e.target.value; setAcademicHistory(a) }} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                          <input type="text" placeholder="Qualification" value={entry.qualification} onChange={(e) => { const a = [...academicHistory]; a[idx].qualification = e.target.value; setAcademicHistory(a) }} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                        </div>
                        <div className="grid sm:grid-cols-3 gap-3">
                          <input type="text" placeholder="From (year)" value={entry.from} onChange={(e) => { const a = [...academicHistory]; a[idx].from = e.target.value; setAcademicHistory(a) }} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                          <input type="text" placeholder="To (year)" value={entry.to} onChange={(e) => { const a = [...academicHistory]; a[idx].to = e.target.value; setAcademicHistory(a) }} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                          <input type="text" placeholder="Grade" value={entry.grade} onChange={(e) => { const a = [...academicHistory]; a[idx].grade = e.target.value; setAcademicHistory(a) }} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                        </div>
                      </div>
                    ))}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Other Qualifications / Certifications</label>
                      <textarea value={formData.otherQualifications} onChange={(e) => updateField("otherQualifications", e.target.value)} rows={3} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" placeholder="e.g. PCV licence, CPC, First Aid, MIDAS..." />
                    </div>
                  </div>
                )}

                {/* ── Step 4: Employment History ── */}
                {step === 4 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-black dark:text-white">Employment History</h3>
                      <button
                        onClick={() => setEmploymentHistory([...employmentHistory, { employer: "", jobTitle: "", from: "", to: "", duties: "", reasonLeaving: "" }])}
                        className="text-sm bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-lg font-medium hover:opacity-80"
                      >
                        + Add
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Start with your most recent employer.</p>
                    {employmentHistory.map((entry, idx) => (
                      <div key={idx} className="border border-gray-200 dark:border-white/10 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Employer {idx + 1}</p>
                          {employmentHistory.length > 1 && (
                            <button onClick={() => setEmploymentHistory(employmentHistory.filter((_, i) => i !== idx))} className="text-red-500 text-xs hover:underline">Remove</button>
                          )}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <input type="text" placeholder="Employer name" value={entry.employer} onChange={(e) => { const a = [...employmentHistory]; a[idx].employer = e.target.value; setEmploymentHistory(a) }} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                          <input type="text" placeholder="Job title" value={entry.jobTitle} onChange={(e) => { const a = [...employmentHistory]; a[idx].jobTitle = e.target.value; setEmploymentHistory(a) }} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <input type="text" placeholder="From (date)" value={entry.from} onChange={(e) => { const a = [...employmentHistory]; a[idx].from = e.target.value; setEmploymentHistory(a) }} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                          <input type="text" placeholder="To (date or Present)" value={entry.to} onChange={(e) => { const a = [...employmentHistory]; a[idx].to = e.target.value; setEmploymentHistory(a) }} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                        </div>
                        <textarea placeholder="Main duties and responsibilities" value={entry.duties} onChange={(e) => { const a = [...employmentHistory]; a[idx].duties = e.target.value; setEmploymentHistory(a) }} rows={2} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                        <input type="text" placeholder="Reason for leaving" value={entry.reasonLeaving} onChange={(e) => { const a = [...employmentHistory]; a[idx].reasonLeaving = e.target.value; setEmploymentHistory(a) }} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Step 5: Role-specific ── */}
                {step === 5 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-black dark:text-white">Role-Specific Information</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Please provide additional information relevant to your selected role(s):
                      {selectedRoles.map((r) => ROLES.find((x) => x.id === r)?.label).filter(Boolean).join(", ") || " (none selected)"}
                    </p>

                    {selectedRoles.includes("drivers") && (
                      <div className="border border-gray-200 dark:border-white/10 rounded-xl p-4 space-y-3">
                        <p className="font-medium text-black dark:text-white">Driver Information</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Driving Licence Type</label>
                            <select value={roleSpecificData.drivingLicence || ""} onChange={(e) => setRoleSpecificData({ ...roleSpecificData, drivingLicence: e.target.value })} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm">
                              <option value="">Select</option>
                              <option value="Full UK - Cat B">Full UK - Cat B (car)</option>
                              <option value="Full UK - Cat D">Full UK - Cat D (bus)</option>
                              <option value="Full UK - Cat D1">Full UK - Cat D1 (minibus)</option>
                              <option value="Provisional">Provisional</option>
                              <option value="International">International</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Years of Driving Experience</label>
                            <input type="text" value={roleSpecificData.drivingExperience || ""} onChange={(e) => setRoleSpecificData({ ...roleSpecificData, drivingExperience: e.target.value })} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" placeholder="e.g. 5 years" />
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">CPC Qualification?</label>
                            <select value={roleSpecificData.cpc || ""} onChange={(e) => setRoleSpecificData({ ...roleSpecificData, cpc: e.target.value })} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm">
                              <option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option><option value="Willing to obtain">Willing to obtain</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Points on Licence</label>
                            <input type="text" value={roleSpecificData.points || ""} onChange={(e) => setRoleSpecificData({ ...roleSpecificData, points: e.target.value })} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" placeholder="0" />
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedRoles.includes("pupilcarer") && (
                      <div className="border border-gray-200 dark:border-white/10 rounded-xl p-4 space-y-3">
                        <p className="font-medium text-black dark:text-white">Pupil Carer Information</p>
                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Experience with SEN children</label>
                          <textarea value={roleSpecificData.senExperience || ""} onChange={(e) => setRoleSpecificData({ ...roleSpecificData, senExperience: e.target.value })} rows={3} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" placeholder="Describe any experience working with children with special educational needs" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">First Aid Qualification?</label>
                          <select value={roleSpecificData.firstAid || ""} onChange={(e) => setRoleSpecificData({ ...roleSpecificData, firstAid: e.target.value })} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm">
                            <option value="">Select</option><option value="Yes - Current">Yes - Current</option><option value="Yes - Expired">Yes - Expired</option><option value="No">No</option><option value="Willing to obtain">Willing to obtain</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {(selectedRoles.includes("operations") || selectedRoles.includes("scheduler") || selectedRoles.includes("admin")) && (
                      <div className="border border-gray-200 dark:border-white/10 rounded-xl p-4 space-y-3">
                        <p className="font-medium text-black dark:text-white">Office Role Information</p>
                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Relevant software skills</label>
                          <textarea value={roleSpecificData.softwareSkills || ""} onChange={(e) => setRoleSpecificData({ ...roleSpecificData, softwareSkills: e.target.value })} rows={2} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" placeholder="e.g. Microsoft Office, route planning software, CRM systems..." />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Management experience (if applicable)</label>
                          <textarea value={roleSpecificData.managementExperience || ""} onChange={(e) => setRoleSpecificData({ ...roleSpecificData, managementExperience: e.target.value })} rows={2} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" placeholder="Describe any team leadership or management experience" />
                        </div>
                      </div>
                    )}

                    {selectedRoles.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p>Please go back to Step 1 and select at least one position.</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Availability</label>
                      <select value={roleSpecificData.availability || ""} onChange={(e) => setRoleSpecificData({ ...roleSpecificData, availability: e.target.value })} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm">
                        <option value="">Select availability</option>
                        <option value="Immediate">Immediate</option>
                        <option value="2 Weeks">2 Weeks notice</option>
                        <option value="1 Month">1 Month notice</option>
                        <option value="Flexible">Flexible</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* ── Step 6: DBS & Disclosure ── */}
                {step === 6 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-black dark:text-white">Rehabilitation of Offenders</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Because of the nature of the work, this post is exempt from the provisions of the Rehabilitation of Offenders Act 1974.
                      Applicants are therefore not entitled to withhold information about convictions which, for other purposes, are &quot;spent&quot;.
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Do you have any criminal convictions, cautions, reprimands or warnings?
                      </label>
                      <select value={formData.noCriminalRecord} onChange={(e) => updateField("noCriminalRecord", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm">
                        <option value="No">No</option><option value="Yes">Yes</option>
                      </select>
                    </div>
                    {formData.noCriminalRecord === "Yes" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Please give details</label>
                        <textarea value={formData.criminalRecord} onChange={(e) => updateField("criminalRecord", e.target.value)} rows={3} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Are you willing to undertake a DBS (Disclosure & Barring Service) check?
                      </label>
                      <select value={formData.futureDisclosure} onChange={(e) => updateField("futureDisclosure", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm">
                        <option value="Yes">Yes</option><option value="No">No</option>
                      </select>
                    </div>

                    <div className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-black dark:text-white">Address History (last 5 years)</h3>
                        <button
                          onClick={() => setAddressHistory([...addressHistory, { address: "", from: "", to: "" }])}
                          className="text-sm bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-lg font-medium hover:opacity-80"
                        >
                          + Add
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Required for DBS check purposes.</p>
                      {addressHistory.map((entry, idx) => (
                        <div key={idx} className="border border-gray-200 dark:border-white/10 rounded-xl p-4 space-y-3 mb-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Address {idx + 1}</p>
                            {addressHistory.length > 1 && (
                              <button onClick={() => setAddressHistory(addressHistory.filter((_, i) => i !== idx))} className="text-red-500 text-xs hover:underline">Remove</button>
                            )}
                          </div>
                          <input type="text" placeholder="Full address" value={entry.address} onChange={(e) => { const a = [...addressHistory]; a[idx].address = e.target.value; setAddressHistory(a) }} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                          <div className="grid sm:grid-cols-2 gap-3">
                            <input type="text" placeholder="From (date)" value={entry.from} onChange={(e) => { const a = [...addressHistory]; a[idx].from = e.target.value; setAddressHistory(a) }} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                            <input type="text" placeholder="To (date or Present)" value={entry.to} onChange={(e) => { const a = [...addressHistory]; a[idx].to = e.target.value; setAddressHistory(a) }} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Step 7: References ── */}
                {step === 7 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-black dark:text-white">References</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Please provide at least two references. One should be your current or most recent employer.</p>
                    {references.map((ref, idx) => (
                      <div key={idx} className="border border-gray-200 dark:border-white/10 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Reference {idx + 1}</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <input type="text" placeholder="Name" value={ref.name} onChange={(e) => { const r = [...references]; r[idx].name = e.target.value; setReferences(r) }} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                          <input type="text" placeholder="Position / Job Title" value={ref.position} onChange={(e) => { const r = [...references]; r[idx].position = e.target.value; setReferences(r) }} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <input type="text" placeholder="Company / Organisation" value={ref.company} onChange={(e) => { const r = [...references]; r[idx].company = e.target.value; setReferences(r) }} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                          <input type="text" placeholder="Relationship to you" value={ref.relationship} onChange={(e) => { const r = [...references]; r[idx].relationship = e.target.value; setReferences(r) }} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <input type="tel" placeholder="Phone number" value={ref.phone} onChange={(e) => { const r = [...references]; r[idx].phone = e.target.value; setReferences(r) }} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                          <input type="email" placeholder="Email address" value={ref.email} onChange={(e) => { const r = [...references]; r[idx].email = e.target.value; setReferences(r) }} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                        </div>
                      </div>
                    ))}
                    {references.length < 3 && (
                      <button
                        onClick={() => setReferences([...references, { name: "", position: "", company: "", phone: "", email: "", relationship: "" }])}
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white underline"
                      >
                        + Add another reference
                      </button>
                    )}
                  </div>
                )}

                {/* ── Step 8: Equal Opportunities ── */}
                {step === 8 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-black dark:text-white">Equal Opportunities Monitoring</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      This information is collected for monitoring purposes only and will be kept separate from your application.
                      Completion is voluntary.
                    </p>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ethnicity</label>
                        <select value={formData.eoEthnicity} onChange={(e) => updateField("eoEthnicity", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm">
                          <option value="">Prefer not to say</option>
                          <option value="White British">White British</option>
                          <option value="White Irish">White Irish</option>
                          <option value="White Other">White Other</option>
                          <option value="Mixed White & Black Caribbean">Mixed White & Black Caribbean</option>
                          <option value="Mixed White & Black African">Mixed White & Black African</option>
                          <option value="Mixed White & Asian">Mixed White & Asian</option>
                          <option value="Mixed Other">Mixed Other</option>
                          <option value="Asian Indian">Asian Indian</option>
                          <option value="Asian Pakistani">Asian Pakistani</option>
                          <option value="Asian Bangladeshi">Asian Bangladeshi</option>
                          <option value="Asian Other">Asian Other</option>
                          <option value="Black Caribbean">Black Caribbean</option>
                          <option value="Black African">Black African</option>
                          <option value="Black Other">Black Other</option>
                          <option value="Chinese">Chinese</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                        <select value={formData.eoGender} onChange={(e) => updateField("eoGender", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm">
                          <option value="">Prefer not to say</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Non-binary">Non-binary</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Age Range</label>
                        <select value={formData.eoAge} onChange={(e) => updateField("eoAge", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm">
                          <option value="">Prefer not to say</option>
                          <option value="18-24">18-24</option>
                          <option value="25-34">25-34</option>
                          <option value="35-44">35-44</option>
                          <option value="45-54">45-54</option>
                          <option value="55-64">55-64</option>
                          <option value="65+">65+</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leisure Interests</label>
                      <textarea value={formData.leisureInterests} onChange={(e) => updateField("leisureInterests", e.target.value)} rows={2} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" placeholder="Hobbies, interests, community involvement..." />
                    </div>
                  </div>
                )}

                {/* ── Step 9: Files & Declaration ── */}
                {step === 9 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-black dark:text-white mb-3">Upload Documents</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Attach your CV, covering letter, or any supporting documents (PDF, DOC, DOCX, JPG, PNG). Optional.
                      </p>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 dark:hover:border-white/40 transition-colors"
                      >
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Click to browse or drag files here</p>
                        <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, JPG, PNG up to 10MB each</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      {files.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {files.map((f, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 dark:bg-white/5 rounded-lg px-4 py-2">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-black dark:text-white">{f.name}</span>
                                <span className="text-xs text-gray-400">({(f.size / 1024).toFixed(0)} KB)</span>
                              </div>
                              <button onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-200 dark:border-white/10 pt-6">
                      <h3 className="text-lg font-semibold text-black dark:text-white mb-3">Declaration</h3>
                      <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                        I declare that the information given on this form is correct and complete to the best of my knowledge.
                        I understand that any false statement or omission may disqualify me from employment or result in my
                        dismissal. I consent to Carity processing and storing this data for recruitment purposes in accordance
                        with GDPR and the Data Protection Act 2018.
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Signature (type full name)</label>
                          <input type="text" value={formData.signatureName} onChange={(e) => updateField("signatureName", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" placeholder="Your full name" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                          <input type="date" value={formData.signatureDate} onChange={(e) => updateField("signatureDate", e.target.value)} className="w-full border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2.5 bg-white dark:bg-white/5 text-black dark:text-white text-sm" />
                        </div>
                      </div>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.agreeDeclaration}
                          onChange={(e) => updateField("agreeDeclaration", e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          I agree to the declaration above and confirm that all information provided is accurate. *
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* ── Step navigation ── */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-white/10">
                  <button
                    onClick={() => setStep(Math.max(0, step - 1))}
                    disabled={step === 0}
                    className="px-6 py-2.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-400">
                    Step {step + 1} of {STEPS.length}
                  </span>
                  {step < STEPS.length - 1 ? (
                    <button
                      onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}
                      className="px-6 py-2.5 rounded-lg text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="px-8 py-2.5 rounded-lg text-sm font-semibold bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? "Submitting..." : "Submit Application"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-black text-white py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
                  <Bus className="h-5 w-5 text-black" />
                </div>
                <span className="text-xl font-bold">Carity</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Making school transport safer, smarter, and more dependable for families across the UK.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><button onClick={() => scrollTo("about")} className="hover:text-white transition-colors">About Us</button></li>
                <li><button onClick={() => scrollTo("benefits")} className="hover:text-white transition-colors">Benefits</button></li>
                <li><button onClick={() => scrollTo("positions")} className="hover:text-white transition-colors">Open Positions</button></li>
                <li><button onClick={() => scrollTo("apply")} className="hover:text-white transition-colors">Apply Now</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Roles</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                {ROLES.map((role) => (
                  <li key={role.id}>
                    <button onClick={() => { if (!selectedRoles.includes(role.id)) toggleRole(role.id); scrollTo("apply") }} className="hover:text-white transition-colors">
                      {role.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a href="mailto:careers@carity.co.uk" className="hover:text-white transition-colors">careers@carity.co.uk</a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href="tel:+442012345678" className="hover:text-white transition-colors">020 1234 5678</a>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>London, United Kingdom</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Carity. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/register" className="hover:text-white transition-colors">Register</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
