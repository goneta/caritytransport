import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// --- Carity Company Knowledge Base ---
const CARITY_INFO = `
Carity Limited is a UK-based school transport company specialising in safe, reliable pupil transportation.

Key facts about Carity:
- Full name: Carity Limited
- Industry: School transport / pupil transportation
- Services: School bus routes, minibus services, private car transport for pupils with special needs
- Coverage: London and surrounding areas
- Mission: To provide the safest and most reliable school transport service, giving parents peace of mind
- Contact: admin@carity.com | +44 20 7123 4567
- Website: carity.com

Safety & compliance:
- All drivers undergo enhanced DBS checks
- Vehicles undergo regular MOT and safety inspections
- Insurance verified and up to date for all vehicles
- GPS tracking on all vehicles for real-time monitoring
- Safeguarding training mandatory for all staff

How Carity works:
1. Schools or parents register on the platform
2. Admin creates transport routes with pickup/drop-off stops
3. Parents book seats for their children on available routes
4. Drivers receive their route assignments and passenger manifests
5. Real-time tracking and notifications keep everyone informed
6. QR code identity system for secure boarding verification
`

const CAREER_INFO = `
Carity is always looking for dedicated professionals to join our team.

Current open positions:
1. School Bus Driver - Full-time/Part-time, GBP28,000-35,000, London & surrounding areas. Category D licence required (PCV training provided). DBS check required.
2. Transport Coordinator - Full-time, GBP25,000-30,000, Head Office London. Route planning and scheduling. Office-based, Mon-Fri.
3. Operations Manager - Full-time, GBP35,000-45,000, Head Office London. Oversee daily fleet operations and compliance.
4. Pupil Carer / Escort - Part-time, GBP12-15/hr, Various locations. Accompany pupils with special needs. First-aid training provided.
5. Administrative Assistant - Full-time, GBP22,000-26,000, Head Office London. Support scheduling, parent communications, and records.

Benefits: Competitive pay, flexible hours, fully funded training (CPC, first-aid, safeguarding, MIDAS), team culture, career growth, free staff shuttle.

How to apply:
1. Visit the Careers page at /careers on our website
2. Browse available positions
3. Click Apply Now to open the application form
4. Fill in personal details, qualifications, and employment history
5. Upload any required documents (CV, licence, DBS certificate)
6. Submit the application
7. You will receive a reference code (e.g. CAR-XXXXXX) to track your application
8. Our HR team reviews applications within 5 working days
`

export async function POST(req: NextRequest) {
  try {
    const { message, userId } = await req.json()

    if (!message || !userId) {
      return NextResponse.json({ error: 'Message and userId required' }, { status: 400 })
    }

    // Store user message
    await prisma.chatMessage.create({
      data: { userId, role: 'USER', content: message },
    })

    // Get user info and role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, role: true, email: true, phone: true },
    })

    const userRole = user?.role || 'PARENT'
    const userName = user?.name || 'there'

    // Build role-specific context
    const contextStr = await fetchContextData(userId, userRole)

    // Get previous conversation (last 10 messages)
    const history = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const historyStr = history
      .reverse()
      .slice(0, -1)
      .map((m: { role: string; content: string }) => `${m.role === 'USER' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n')

    // Build the full prompt
    const prompt = `${contextStr}

${CARITY_INFO}

${CAREER_INFO}

${historyStr ? `Previous conversation:\n${historyStr}\n` : ''}
User (${userRole}) asks: ${message}

Instructions:
- You are the Carity AI Assistant, a helpful chatbot for the Carity school transport platform.
- Respond based on the user's role (${userRole}). Admins get operational data, drivers get route info, parents get child transport info.
- For company info questions: use the Carity company knowledge above.
- For job/career questions: use the career information above, guide them to /careers to apply.
- For transport questions: use the context data provided about routes, schedules, vehicles, and pupils.
- For seat booking: guide parents to the Bookings section or explain how seat assignment works.
- Keep responses friendly, professional, and concise.
- If you cannot answer, offer to escalate to an admin or provide contact details (admin@carity.com, +44 20 7123 4567).
- Never make up data that is not in the provided context.`

    let aiResponse: string

    // Try Anthropic API if key is configured
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (anthropicKey && anthropicKey !== 'your-anthropic-api-key') {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
          }),
        })

        if (!response.ok) {
          // API error (credit limit, rate limit, etc.) - fall back to rule-based
          console.warn('Anthropic API error:', response.status, response.statusText)
          aiResponse = generateLocalResponse(message, userRole, userName, await fetchRawContextData(userId, userRole))
        } else {
          const data = await response.json()
          aiResponse = data.content?.[0]?.text || generateLocalResponse(message, userRole, userName, await fetchRawContextData(userId, userRole))
        }
      } catch (err) {
        console.warn('Anthropic API unavailable, using rule-based fallback:', err)
        aiResponse = generateLocalResponse(message, userRole, userName, await fetchRawContextData(userId, userRole))
      }
    } else {
      // No API key - use local rule-based responses
      aiResponse = generateLocalResponse(message, userRole, userName, await fetchRawContextData(userId, userRole))
    }

    // Store AI response
    await prisma.chatMessage.create({
      data: { userId, role: 'ASSISTANT', content: aiResponse },
    })

    return NextResponse.json({ message: aiResponse })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
  }
}

// --- Context Builders ---

function buildRoleContext(userId: string, role: string, name: string): string {
  return `You are a helpful transport assistant for the Carity school transport platform.
The user's name is ${name}, role: ${role}.
Current date: ${new Date().toLocaleDateString('en-GB')}.`
}

async function fetchContextData(userId: string, role: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
  let contextStr = buildRoleContext(userId, role, user?.name || 'User')

  if (role === 'PARENT') {
    const parent = await prisma.parent.findUnique({
      where: { userId },
      include: {
        pupils: {
          include: {
            school: { select: { name: true } },
            seatAssignments: {
              where: { status: 'ASSIGNED' },
              include: {
                schedule: {
                  include: {
                    driver: { include: { user: { select: { name: true, phone: true } } } },
                    vehicle: { select: { regPlate: true, model: true, type: true, seats: true } },
                  },
                },
              },
            },
            absences: { where: { date: { gte: new Date() } } },
          },
        },
      },
    })

    if (parent?.pupils && parent.pupils.length > 0) {
      contextStr += '\nChildren registered:\n'
      parent.pupils.forEach((pupil: any) => {
        contextStr += `- ${pupil.fullName} (${pupil.yearLevel || 'N/A'}), School: ${pupil.school?.name || 'Not assigned'}\n`
        if (pupil.seatAssignments.length > 0) {
          pupil.seatAssignments.forEach((assignment: any) => {
            const sched = assignment.schedule
            contextStr += `  Route: ${sched.routeName}, Departure: ${sched.departureTime}, Direction: ${sched.direction}, Driver: ${sched.driver?.user.name || 'TBA'} (Phone: ${sched.driver?.user.phone || 'N/A'}), Vehicle: ${sched.vehicle?.regPlate || 'TBA'} (${sched.vehicle?.type || ''} - ${sched.vehicle?.seats || '?'} seats)\n`
          })
        } else {
          contextStr += `  No transport route assigned yet.\n`
        }
        if (pupil.absences.length > 0) {
          contextStr += `  Upcoming absences: ${pupil.absences.map((a: any) => new Date(a.date).toLocaleDateString('en-GB')).join(', ')}\n`
        }
        if (pupil.specialRequirements) {
          contextStr += `  Special requirements: ${pupil.specialRequirements}\n`
        }
      })
    } else {
      contextStr += '\nNo children registered yet.\n'
    }

  } else if (role === 'DRIVER') {
    const driver = await prisma.driver.findUnique({
      where: { userId },
      include: {
        user: { select: { name: true } },
        company: { select: { name: true } },
        schedules: {
          where: { status: { not: 'CANCELLED' } },
          include: {
            vehicle: { select: { regPlate: true, model: true, type: true, seats: true } },
            school: { select: { name: true } },
            seatAssignments: { include: { pupil: { select: { fullName: true, phone: true, pickupLocation: true } } } },
            _count: { select: { seatAssignments: true } },
          },
          take: 10,
        },
      },
    })

    if (driver) {
      contextStr += `\nCompany: ${driver.company?.name || 'Not assigned'}\n`
      contextStr += `Licence: ${driver.licenceNumber || 'N/A'}, Class: ${driver.licenceClass || 'N/A'}\n`
      if (driver.schedules.length > 0) {
        contextStr += '\nAssigned routes:\n'
        driver.schedules.forEach((sched: any) => {
          contextStr += `- ${sched.routeName}: ${sched.departureTime}, ${sched.direction}, Vehicle: ${sched.vehicle?.regPlate || 'TBA'}, Pupils: ${sched._count?.seatAssignments || 0}/${sched.vehicle?.seats || '?'}\n`
          if (sched.seatAssignments.length > 0) {
            sched.seatAssignments.forEach((sa: any) => {
              contextStr += `  Pupil: ${sa.pupil.fullName}, Pickup: ${sa.pupil.pickupLocation || 'N/A'}\n`
            })
          }
        })
      } else {
        contextStr += '\nNo routes assigned.\n'
      }
    }

  } else if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'OPERATIONS' || role === 'SCHEDULER') {
    const [totalPupils, totalDrivers, totalVehicles, totalRoutes, totalParents, pendingApps] = await Promise.all([
      prisma.pupil.count(),
      prisma.driver.count(),
      prisma.vehicle.count(),
      prisma.transportSchedule.count({ where: { status: { not: 'CANCELLED' } } }),
      prisma.parent.count(),
      prisma.jobApplication.count({ where: { status: 'PENDING' } }),
    ])

    contextStr += `\nPlatform overview:\n`
    contextStr += `- Total pupils: ${totalPupils}\n`
    contextStr += `- Total drivers: ${totalDrivers}\n`
    contextStr += `- Total vehicles: ${totalVehicles}\n`
    contextStr += `- Active routes: ${totalRoutes}\n`
    contextStr += `- Total parents: ${totalParents}\n`
    contextStr += `- Pending job applications: ${pendingApps}\n`

    const recentSchedules = await prisma.transportSchedule.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: {
        driver: { include: { user: { select: { name: true } } } },
        vehicle: { select: { regPlate: true, type: true, seats: true } },
        school: { select: { name: true } },
        _count: { select: { seatAssignments: true } },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    })

    if (recentSchedules.length > 0) {
      contextStr += '\nRecent routes:\n'
      recentSchedules.forEach((s: any) => {
        contextStr += `- ${s.routeName}: ${s.departureTime}, ${s.direction}, Driver: ${s.driver?.user?.name || 'TBA'}, Vehicle: ${s.vehicle?.regPlate || 'TBA'} (${s._count.seatAssignments}/${s.vehicle?.seats || '?'} seats filled), School: ${s.school?.name || 'N/A'}, Status: ${s.status}\n`
      })
    }
  }

  // Add available routes for booking context
  const availableRoutes = await prisma.transportSchedule.findMany({
    where: { status: 'SCHEDULED' },
    include: {
      vehicle: { select: { regPlate: true, type: true, seats: true } },
      school: { select: { name: true } },
      _count: { select: { seatAssignments: true } },
    },
    take: 20,
  })

  if (availableRoutes.length > 0) {
    contextStr += '\nAvailable routes for booking:\n'
    availableRoutes.forEach((r: any) => {
      const available = (r.vehicle?.seats || 0) - (r._count?.seatAssignments || 0)
      contextStr += `- ${r.routeName}: ${r.departureTime}, ${r.direction}, ${r.vehicle?.type || 'Vehicle'} (${r.vehicle?.regPlate || 'TBA'}), ${available} seats available, School: ${r.school?.name || 'N/A'}, Price: ${r.pricePerSeat > 0 ? 'GBP' + r.pricePerSeat + '/seat' : 'Free'}\n`
    })
  }

  return contextStr
}

// --- Raw context data for rule-based responses ---

interface RawContext {
  userName: string
  parent?: any
  driver?: any
  isAdmin?: boolean
  totalPupils?: number
  totalDrivers?: number
  totalVehicles?: number
  totalRoutes?: number
  availableRoutes?: any[]
}

async function fetchRawContextData(userId: string, role: string): Promise<RawContext> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, role: true } })
  const ctx: RawContext = { userName: user?.name || 'there' }

  if (role === 'PARENT') {
    ctx.parent = await prisma.parent.findUnique({
      where: { userId },
      include: {
        pupils: {
          include: {
            school: { select: { name: true } },
            seatAssignments: {
              where: { status: 'ASSIGNED' },
              include: {
                schedule: {
                  include: {
                    driver: { include: { user: { select: { name: true, phone: true } } } },
                    vehicle: { select: { regPlate: true, model: true, type: true, seats: true } },
                  },
                },
              },
            },
            absences: { where: { date: { gte: new Date() } } },
          },
        },
      },
    })
  } else if (role === 'DRIVER') {
    ctx.driver = await prisma.driver.findUnique({
      where: { userId },
      include: {
        user: { select: { name: true } },
        schedules: {
          where: { status: { not: 'CANCELLED' } },
          include: {
            vehicle: { select: { regPlate: true, model: true, type: true } },
            _count: { select: { seatAssignments: true } },
            seatAssignments: { include: { pupil: { select: { fullName: true, pickupLocation: true, phone: true } } } },
          },
          take: 10,
        },
      },
    })
  } else if (['ADMIN', 'SUPER_ADMIN', 'OPERATIONS', 'SCHEDULER'].includes(role)) {
    ctx.isAdmin = true
    const [tp, td, tv, tr] = await Promise.all([
      prisma.pupil.count(),
      prisma.driver.count(),
      prisma.vehicle.count(),
      prisma.transportSchedule.count({ where: { status: { not: 'CANCELLED' } } }),
    ])
    ctx.totalPupils = tp
    ctx.totalDrivers = td
    ctx.totalVehicles = tv
    ctx.totalRoutes = tr
  }

  // Available routes for booking
  ctx.availableRoutes = await prisma.transportSchedule.findMany({
    where: { status: 'SCHEDULED' },
    include: {
      vehicle: { select: { regPlate: true, type: true, seats: true } },
      school: { select: { name: true } },
      _count: { select: { seatAssignments: true } },
    },
    take: 10,
  })

  return ctx
}

// --- Enhanced Rule-Based Response Engine ---

function generateLocalResponse(message: string, role: string, userName: string, ctx: RawContext): string {
  const msg = message.toLowerCase()
  const firstName = userName.split(' ')[0] || 'there'

  // --- Greetings ---
  if (msg.match(/^(hi|hello|hey|good\s*(morning|afternoon|evening)|help)[\s!.?]*$/i) || (msg.includes('help') && msg.length < 20)) {
    return getWelcomeMessage(firstName, role)
  }

  // --- Company Info ---
  if (msg.includes('carity') || msg.includes('company') || msg.includes('about') || msg.includes('who are you') || msg.includes('what is this')) {
    return `Carity Limited is a UK-based school transport company specialising in safe, reliable pupil transportation across London and surrounding areas.\n\nWe provide school bus routes, minibus services, and private car transport for pupils with special needs. All our drivers undergo enhanced DBS checks, and every vehicle is GPS-tracked for real-time monitoring.\n\nOur mission is to give parents complete peace of mind when it comes to their children's school journey.\n\nContact us: admin@carity.com | +44 20 7123 4567`
  }

  // --- Jobs & Careers ---
  if (msg.includes('job') || msg.includes('career') || msg.includes('hiring') || msg.includes('vacanc') || msg.includes('work for') || msg.includes('position') || msg.includes('recruit') || msg.includes('employ')) {
    if (msg.includes('apply') || msg.includes('how to') || msg.includes('application')) {
      return `To apply for a position at Carity:\n\n1. Visit the **Careers** page on our website (/careers)\n2. Browse the available positions\n3. Click **Apply Now** on the role you're interested in\n4. Complete the application form with your personal details, qualifications, and experience\n5. Upload your CV and any required documents\n6. Submit your application\n\nYou'll receive a reference code (e.g. CAR-XXXXXX) to track your application status. Our HR team reviews all applications within 5 working days.\n\nIs there a specific role you're interested in?`
    }
    return `We're always looking for great people to join the Carity team! Current open positions:\n\n**School Bus Driver** - GBP28,000-35,000 (Full-time/Part-time)\n**Transport Coordinator** - GBP25,000-30,000 (Full-time)\n**Operations Manager** - GBP35,000-45,000 (Full-time)\n**Pupil Carer / Escort** - GBP12-15/hr (Part-time)\n**Administrative Assistant** - GBP22,000-26,000 (Full-time)\n\nBenefits include competitive pay, flexible hours, fully funded training, career progression, and a free staff shuttle.\n\nVisit **/careers** to apply or ask me about a specific role!`
  }

  // --- Booking / Seat Queries ---
  if (msg.includes('book') || msg.includes('seat') || msg.includes('reserve')) {
    if (ctx.availableRoutes && ctx.availableRoutes.length > 0) {
      const routeList = ctx.availableRoutes.slice(0, 5).map((r: any) => {
        const avail = (r.vehicle?.seats || 0) - (r._count?.seatAssignments || 0)
        return `**${r.routeName}** - ${r.departureTime}, ${r.vehicle?.type || 'Vehicle'}, ${avail} seats available${r.pricePerSeat > 0 ? ', GBP' + r.pricePerSeat + '/seat' : ''}`
      }).join('\n')
      return `Here are available routes you can book:\n\n${routeList}\n\nTo book a seat, go to **Bookings** in the sidebar, select a route, choose your child, and confirm the booking. Need help with a specific route?`
    }
    return `To book a seat for your child:\n\n1. Go to **Bookings** in your dashboard sidebar\n2. Browse available routes\n3. Select a route and choose your child\n4. Confirm the booking\n\nIf you don't see available routes, contact your school administrator to set up transport. You can also email admin@carity.com for assistance.`
  }

  // --- Available Routes ---
  if (msg.includes('route') || msg.includes('available') || msg.includes('schedule') || msg.includes('transport')) {
    if (role === 'DRIVER' && ctx.driver) {
      if (ctx.driver.schedules && ctx.driver.schedules.length > 0) {
        const routes = ctx.driver.schedules.map((s: any) =>
          `**${s.routeName}** - ${s.departureTime}, ${s.direction === 'HOME_TO_SCHOOL' ? 'To School' : 'To Home'}, Vehicle: ${s.vehicle?.regPlate || 'TBA'}, ${s._count?.seatAssignments || 0} pupils`
        ).join('\n')
        return `Here are your assigned routes, ${firstName}:\n\n${routes}\n\nCheck the **My Routes** section for full details including your passenger manifest.`
      }
      return `You don't have any routes assigned yet, ${firstName}. Please check with your admin or wait for route assignments.`
    }

    if (ctx.availableRoutes && ctx.availableRoutes.length > 0) {
      const routeList = ctx.availableRoutes.slice(0, 5).map((r: any) => {
        const avail = (r.vehicle?.seats || 0) - (r._count?.seatAssignments || 0)
        return `**${r.routeName}** - ${r.departureTime}, ${r.school?.name || 'N/A'}, ${avail} seats available`
      }).join('\n')
      return `Here are the current transport routes:\n\n${routeList}\n\nWould you like more details about a specific route?`
    }
    return `I don't see any scheduled routes at the moment. For the latest information, check the **Schedules** section on your dashboard or contact admin@carity.com.`
  }

  // --- Parent-specific: Pickup / Driver / Absence / Child ---
  if (role === 'PARENT') {
    if (msg.includes('pickup') || msg.includes('pick up') || msg.includes('what time') || msg.includes('departure')) {
      if (ctx.parent?.pupils?.length > 0) {
        const assignments = ctx.parent.pupils.flatMap((p: any) => p.seatAssignments)
        if (assignments.length > 0) {
          const routes = assignments.map((a: any) =>
            `**${a.schedule.routeName}**: ${a.schedule.departureTime} (${a.schedule.direction === 'HOME_TO_SCHOOL' ? 'To School' : 'To Home'})`
          ).join('\n')
          return `Hi ${firstName}! Here are your children's pickup times:\n\n${routes}\n\nCheck **My Children** for the full schedule and specific stop times.`
        }
      }
      return `Hi ${firstName}! Your children don't have a transport route assigned yet. Please contact your school administrator to arrange transport.`
    }

    if (msg.includes('driver')) {
      if (ctx.parent?.pupils?.length > 0) {
        const assignments = ctx.parent.pupils.flatMap((p: any) => p.seatAssignments)
        if (assignments.length > 0) {
          const driverInfo = assignments.map((a: any) =>
            `Route **${a.schedule.routeName}**: Driver ${a.schedule.driver?.user?.name || 'TBA'}, Vehicle ${a.schedule.vehicle?.regPlate || 'TBA'} (${a.schedule.vehicle?.type || 'N/A'})`
          ).join('\n')
          return `Here is your driver information:\n\n${driverInfo}\n\nIf you need to contact the driver directly, check the route details in your dashboard.`
        }
      }
      return `I don't see any assigned routes for your children yet. Contact admin for driver information.`
    }

    if (msg.includes('absent') || msg.includes('absence') || msg.includes('not coming') || msg.includes('sick') || msg.includes('ill')) {
      return `To report an absence for your child:\n\n1. Go to **My Children** in the sidebar\n2. Click on your child's name\n3. Click **Report Absence**\n4. Select the date and add a reason\n5. Submit - the driver and admin will be notified automatically\n\nAbsences should be reported at least 48 hours in advance when possible. Is there anything else I can help with?`
    }

    if (msg.includes('add') && (msg.includes('child') || msg.includes('pupil') || msg.includes('son') || msg.includes('daughter'))) {
      return `To add another child:\n\n1. Go to **My Children** in the sidebar\n2. Click **Add Child**\n3. Fill in their details (name, date of birth, school, year group)\n4. Submit the form\n\nOnce added, an administrator will assign them to an appropriate transport route. Would you like help with anything else?`
    }

    if (msg.includes('child') || msg.includes('children') || msg.includes('pupil')) {
      if (ctx.parent?.pupils?.length > 0) {
        const childInfo = ctx.parent.pupils.map((p: any) => {
          const route = p.seatAssignments?.[0]?.schedule
          return `**${p.fullName}** - ${p.yearLevel || 'N/A'}, ${p.school?.name || 'N/A'}${route ? ', Route: ' + route.routeName + ' at ' + route.departureTime : ', No route assigned'}`
        }).join('\n')
        return `Here are your registered children:\n\n${childInfo}\n\nGo to **My Children** for full details and management options.`
      }
      return `You don't have any children registered yet. Go to **My Children** > **Add Child** to get started.`
    }
  }

  // --- Driver-specific ---
  if (role === 'DRIVER') {
    if (msg.includes('pupil') || msg.includes('passenger') || msg.includes('manifest') || msg.includes('student')) {
      if (ctx.driver?.schedules?.length > 0) {
        let pupilList = ''
        ctx.driver.schedules.forEach((s: any) => {
          if (s.seatAssignments?.length > 0) {
            pupilList += `\n**${s.routeName}** (${s.departureTime}):\n`
            s.seatAssignments.forEach((sa: any) => {
              pupilList += `- ${sa.pupil.fullName}${sa.pupil.pickupLocation ? ' (Pickup: ' + sa.pupil.pickupLocation + ')' : ''}\n`
            })
          }
        })
        if (pupilList) {
          return `Here is your passenger manifest, ${firstName}:\n${pupilList}\nCheck **My Routes** for the complete details including special requirements.`
        }
      }
      return `No passengers assigned to your routes yet, ${firstName}. Check back once the admin assigns pupils to your routes.`
    }

    if (msg.includes('vehicle') || msg.includes('bus') || msg.includes('car')) {
      if (ctx.driver?.schedules?.length > 0) {
        const vehicles = [...new Set(ctx.driver.schedules.map((s: any) => s.vehicle?.regPlate).filter(Boolean))]
        return `Your assigned vehicle(s): ${vehicles.join(', ') || 'Not yet assigned'}. Check **My Routes** for full vehicle details.`
      }
      return `No vehicle assigned yet. Please check with your admin.`
    }
  }

  // --- Admin-specific ---
  if (ctx.isAdmin) {
    if (msg.includes('overview') || msg.includes('stats') || msg.includes('summary') || msg.includes('dashboard')) {
      return `Here's the platform overview, ${firstName}:\n\n**${ctx.totalPupils || 0}** total pupils\n**${ctx.totalDrivers || 0}** active drivers\n**${ctx.totalVehicles || 0}** vehicles\n**${ctx.totalRoutes || 0}** active routes\n\nFor detailed analytics, check the **Dashboard** or individual management sections.`
    }

    if (msg.includes('application') || msg.includes('applicant') || msg.includes('recruitment')) {
      return `To manage job applications, go to **Careers** in the admin sidebar. You can review pending applications, schedule interviews, and manage the recruitment pipeline from there. Need help with anything specific?`
    }
  }

  // --- Contact ---
  if (msg.includes('contact') || msg.includes('phone') || msg.includes('call') || msg.includes('email') || msg.includes('support')) {
    return `You can reach Carity through:\n\n**In-app chat**: Use this chat for quick questions\n**Email**: admin@carity.com\n**Phone**: +44 20 7123 4567\n\nFor urgent transport issues, please call directly. For general enquiries, email or chat are fastest.`
  }

  // --- Delay / Status ---
  if (msg.includes('delay') || msg.includes('late') || msg.includes('status') || msg.includes('where')) {
    return `For real-time transport status, check the **Transport Tracking** section on your dashboard. If there's an emergency or unexpected delay, the driver or admin will send you a notification automatically.\n\nIf you're concerned about a specific route, contact admin@carity.com or call +44 20 7123 4567.`
  }

  // --- Cancel ---
  if (msg.includes('cancel')) {
    return `I don't see any active cancellations for your routes at the moment. If a route is cancelled, you'll receive an automatic notification via SMS and email.\n\nTo cancel a booking, go to your **Bookings** section. For other cancellation queries, contact admin@carity.com.`
  }

  // --- Safety ---
  if (msg.includes('safe') || msg.includes('dbs') || msg.includes('security') || msg.includes('safeguard')) {
    return `Safety is our top priority at Carity:\n\n- All drivers undergo enhanced DBS checks\n- Mandatory safeguarding training for all staff\n- GPS tracking on every vehicle\n- Regular MOT and safety inspections\n- Insurance verified for all vehicles\n- QR code identity verification for boarding\n\nIf you have any safety concerns, please contact us immediately at +44 20 7123 4567.`
  }

  // --- Thank you ---
  if (msg.match(/^(thanks|thank you|cheers|ta|great|perfect|ok|okay)[\s!.]*$/i)) {
    return `You're welcome, ${firstName}! If you need anything else, I'm here to help.`
  }

  // --- Default fallback ---
  return `Thank you for your message, ${firstName}. I wasn't quite able to find a specific answer for that.\n\nHere's what I can help with:\n- **Transport routes & schedules** - available routes, pickup times\n- **Seat booking** - how to book transport for your child\n- **Company info** - about Carity and our services\n- **Careers** - job opportunities and how to apply\n- **Driver & vehicle info** - assigned drivers and vehicles\n- **Absences** - how to report a child's absence\n\nOr you can contact our team directly:\n- Email: admin@carity.com\n- Phone: +44 20 7123 4567\n\nWhat would you like to know?`
}

function getWelcomeMessage(firstName: string, role: string): string {
  const base = `Hello ${firstName}!`

  if (role === 'PARENT') {
    return `${base} I'm your Carity transport assistant. I can help you with:\n\n- Pickup times and schedules\n- Driver and vehicle information\n- Booking a seat for your child\n- Reporting absences\n- Company info and careers\n\nWhat can I help you with today?`
  }

  if (role === 'DRIVER') {
    return `${base} I'm your Carity assistant. I can help you with:\n\n- Your assigned routes and schedules\n- Passenger manifests\n- Vehicle information\n- Company info and support\n\nWhat do you need?`
  }

  if (['ADMIN', 'SUPER_ADMIN', 'OPERATIONS', 'SCHEDULER'].includes(role)) {
    return `${base} I'm the Carity platform assistant. I can help you with:\n\n- Platform overview and statistics\n- Route and schedule information\n- Driver and vehicle details\n- Recruitment and applications\n- Company info\n\nHow can I assist you?`
  }

  return `${base} I'm the Carity assistant. I can help with transport routes, bookings, company information, and career opportunities. What would you like to know?`
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || ''

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    })

    return NextResponse.json(messages)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}
