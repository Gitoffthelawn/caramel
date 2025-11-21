import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'

const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10
const fallbackBaseURL = 'http://localhost:3000'
const baseURL =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    fallbackBaseURL
const trustedOrigins = Array.from(
    new Set([process.env.NEXT_PUBLIC_BASE_URL || '', baseURL].filter(Boolean)),
)

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
        password: {
            hash: async (password: string) => bcrypt.hash(password, saltRounds),
            verify: async ({
                hash,
                password,
            }: {
                hash: string
                password: string
            }) => bcrypt.compare(password, hash),
        },
    },
    user: {
        additionalFields: {
            username: {
                type: 'string',
                required: false,
            },
            firstName: {
                type: 'string',
                required: false,
            },
            lastName: {
                type: 'string',
                required: false,
            },
            role: {
                type: 'string',
                required: false,
                defaultValue: 'USER',
                input: false,
            },
            status: {
                type: 'string',
                required: false,
                defaultValue: 'ACTIVE_USER',
                input: false,
            },
            encodedPictureUrl: {
                type: 'string',
                required: false,
            },
        },
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60,
        },
    },
    secret:
        process.env.BETTER_AUTH_SECRET ||
        process.env.JWT_SECRET ||
        'caramel-better-auth-secret',
    baseURL,
    trustedOrigins,
    advanced: {
        useSecureCookies: process.env.NODE_ENV === 'production',
    },
})
