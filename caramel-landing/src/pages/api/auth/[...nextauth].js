import { env } from '@/env.mjs'
import prisma from '@/lib/prisma'
import { USER } from '@/prisma/lib/fields'
import { LoginError } from '@/types/login-error'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { User } from '@prisma/client'
import bcrypt from 'bcryptjs'
import NextAuth, {
    CallbackJwt,
    CallbackSession,
    NextAuthOptions,
} from 'next-auth'
import AppleProvider from 'next-auth/providers/apple'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    // useSecureCookies: true,
    providers: [
        GoogleProvider({
            clientId: `${env.GOOGLE_CLIENT_ID}`,
            clientSecret: `${env.GOOGLE_CLIENT_SECRET}`,
            checks: [],
        }),
        AppleProvider({
            clientId: `${env.APPLE_CLIENT_ID}`,
            clientSecret: `${env.APPLE_CLIENT_SECRET}`,
        }),
        CredentialsProvider({
            // The name to display on the sign in form (e.g. "Sign in with...")
            name: 'Credentials',
            // `credentials` is used to generate a form on the sign in page.
            // You can specify which fields should be submitted, by adding keys to the `credentials` object.
            // e.g. domain, username, password, 2FA token, etc.
            // You can pass any HTML attribute to the <input> tag through the object.
            credentials: {
                email: {
                    label: 'Email',
                    type: 'text',
                    placeholder: 'jsmith@gmail.com',
                },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials, req) {
                const { email, password } = credentials!

                // find user by email and include accounts
                const user = await prisma.user.findUnique({
                    where: { email: email.trim().toLowerCase() },
                    include: { accounts: true },
                })

                if (!user)
                    throw new LoginError('ERROR_CODE_USER_NOT_FOUND', 'ERR00')

                // Check if the account status is active
                if (user.status !== 'ACTIVE_USER')
                    throw new LoginError('ERROR_CODE_INACTIVE_USER', 'ERR01')

                // Check the login method
                if (!user.password)
                    throw new LoginError('ERROR_CODE_NO_PASSWORD_SET', 'ERR02')

                // Check if the account is verified
                const accountVerification =
                    await prisma.verificationRequest.findFirst({
                        where: {
                            identifier: user.id,
                        },
                    })
                if (accountVerification) {
                    throw new LoginError(
                        'ERROR_CODE_ACCOUNT_NOT_VERIFIED',
                        'ERR03',
                    )
                }

                const passwordMatch = bcrypt.compareSync(
                    password,
                    user.password,
                )
                if (!passwordMatch) {
                    throw new LoginError(
                        'ERROR_CODE_INCORRECT_PASSWORD',
                        'ERR04',
                    )
                }

                user.name = user.name || user.username

                return user
            },
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    cookies: {
        csrfToken: {
            name: `next-auth.csrf-token`,
            options: {
                httpOnly: true,
                sameSite: 'none',
                path: '/',
                secure: true,
            },
        },
        pkceCodeVerifier: {
            name: `next-auth.pkce.code_verifier`,
            options: {
                httpOnly: true,
                sameSite: 'none',
                path: '/',
                secure: true,
            },
        },
    },
    secret: `${env.JWT_SECRET}`,
    callbacks: {
        jwt: async ({ token, user }: CallbackJwt) => {
            if (user) {
                token.id = user.id
            }
            return token
        },
        session: async ({ session, token }: CallbackSession) => {
            try {
                // Check if user exists in database
                const dbUser = await prisma.user.findFirst({
                    where: { id: token.id },
                    select: {
                        ...USER.select(),
                        settingsUpdated: true,
                        password: true, // will be removed from session
                    },
                })
                if (!dbUser) return { user: {} }

                if (!dbUser.settingsUpdated) {
                    const notificationsSettings =
                        await prisma.notificationSettings.findMany({
                            where: {
                                NOT: {
                                    type: 'FAVORITE_SCHOOL',
                                },
                            },
                        })
                    await prisma.user.update({
                        where: {
                            id: dbUser.id,
                        },
                        data: {
                            notificationSettings: {
                                connect: notificationsSettings.map(setting => ({
                                    id: setting.id,
                                })),
                            },
                            settingsUpdated: true,
                        },
                    })
                }

                const {
                    isSubscribedToEmails,
                    settingsUpdated,
                    status,
                    ...sanitizedUser
                } = dbUser

                session.user = {
                    ...sanitizedUser,
                    isNew: sanitizedUser.password === null,
                } as unknown as User & { isNew?: boolean }
                delete session.user.password
                return session
            } catch (error) {
                console.error('Session callback error:', error)
                return { user: {} } // Safe default return structure
            }
        },
    },
    pages: {
        signIn: '/login',
        signUp: '/signup',
    },
}
// @ts-ignore
export default NextAuth(authOptions)
