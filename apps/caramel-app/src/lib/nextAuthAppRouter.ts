import NextAuth from 'next-auth'
import { authOptions } from '@/lib/authOptions'

export const { GET: auth, POST } = NextAuth(authOptions)
