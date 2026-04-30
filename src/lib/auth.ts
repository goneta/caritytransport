import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from './prisma'
import { getSecurityPolicy, getTwoFactorPolicyRequirement, isTwoFactorEligibleRole, verifySecondFactorForLogin } from '@/lib/two-factor'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        twoFactorCode: { label: 'Two-factor code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        if (user.status === 'SUSPENDED') {
          throw new Error('Account is suspended')
        }

        const policy = await getSecurityPolicy()
        const role = user.role
        const twoFactorPolicyRequired = getTwoFactorPolicyRequirement(role, policy)
        if (isTwoFactorEligibleRole(role) && user.twoFactorEnabled) {
          const twoFactorCode = String((credentials as any).twoFactorCode || '').trim()
          if (!twoFactorCode) throw new Error('TWO_FACTOR_REQUIRED')
          const twoFactorValid = await verifySecondFactorForLogin(user, twoFactorCode)
          if (!twoFactorValid) throw new Error('INVALID_TWO_FACTOR')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          twoFactorEnabled: user.twoFactorEnabled,
          twoFactorPolicyRequired,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.status = (user as any).status
        token.twoFactorEnabled = (user as any).twoFactorEnabled
        token.twoFactorPolicyRequired = (user as any).twoFactorPolicyRequired
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role
        ;(session.user as any).status = token.status
        ;(session.user as any).twoFactorEnabled = token.twoFactorEnabled
        ;(session.user as any).twoFactorPolicyRequired = token.twoFactorPolicyRequired
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 60, // 30 minutes
  },
  secret: process.env.NEXTAUTH_SECRET,
})
