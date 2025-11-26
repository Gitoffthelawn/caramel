'use client'

import { inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import type { auth } from './auth'

const baseURL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

export const authClient = createAuthClient({
    baseURL,
    plugins: [inferAdditionalFields<typeof auth>()],
})

export const signIn = {
    email: authClient.signIn.email,
    social: authClient.signIn.social,
}

export const signUp = authClient.signUp
export const signOut = authClient.signOut
export const useSession = authClient.useSession
