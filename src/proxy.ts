import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  const { pathname } = request.nextUrl

  // Public paths
  const publicPaths = ['/login', '/register', '/', '/api/auth', '/api/seed']
  const isPublic = publicPaths.some(p => pathname.startsWith(p))

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token && (pathname === '/login' || pathname === '/register')) {
    const role = token.role as string
    if (['SUPER_ADMIN', 'ADMIN', 'SCHEDULER', 'OPERATIONS'].includes(role)) {
      return NextResponse.redirect(new URL('/admin', request.url))
    } else if (role === 'DRIVER') {
      return NextResponse.redirect(new URL('/driver', request.url))
    } else if (role === 'PUPIL') {
      return NextResponse.redirect(new URL('/pupil', request.url))
    } else {
      return NextResponse.redirect(new URL('/parent', request.url))
    }
  }

  // Role-based access
  if (token && pathname.startsWith('/admin')) {
    const role = token.role as string
    if (!['SUPER_ADMIN', 'ADMIN', 'SCHEDULER', 'OPERATIONS'].includes(role)) {
      return NextResponse.redirect(new URL('/parent', request.url))
    }
  }

  if (token && pathname.startsWith('/driver')) {
    const role = token.role as string
    if (role !== 'DRIVER' && !['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      return NextResponse.redirect(new URL('/parent', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
