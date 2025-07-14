// pages/api/auth/[...nextauth].js
import prisma from '@/lib/prisma'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: {
                    label: 'Email',
                    type: 'text',
                    placeholder: 'jsmith@gmail.com',
                },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials, req) {
                const { email, password } = credentials

                // Find user by email (case-insensitive) and include accounts
                const user = await prisma.user.findUnique({
                    where: { email: email.trim().toLowerCase() },
                    include: { accounts: true },
                })

                if (!user) throw new Error('User not found')

                if (user.status !== 'ACTIVE_USER')
                    throw new Error('User is inactive')

                if (!user.password)
                    throw new Error('No password set for this user')

                const passwordMatch = bcrypt.compareSync(
                    password,
                    user.password,
                )
                if (!passwordMatch) throw new Error('Incorrect password')

                // Set a display name if missing.
                user.name = user.name || user.username
                return user
            },
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    // Your cookie settings can remain the same.
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
    secret: process.env.JWT_SECRET,
    callbacks: {
        // The JWT callback is called whenever a token is created or updated.
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                // Generate an access token.
                token.accessToken = jwt.sign(
                    { id: user.id, username: user.username },
                    process.env.JWT_SECRET,
                    { expiresIn: '1h' },
                )
            }
            return token
        },
        // The session callback shapes what is exposed to the client.
        async session({ session, token }) {
            // Retrieve only the relevant fields from the database.
            const dbUser = await prisma.user.findUnique({
                where: { id: token.id },
                select: {
                    id: true,
                    username: true,
                    email: true,
                },
            })
            if (!dbUser) return null

            // Expose only the minimal user info and the access token.
            session.user = dbUser
            session.accessToken = token.accessToken // This is our generated token.
            return session
        },
    },
    pages: {
        signIn: '/login',
        signUp: '/signup',
    },
}

export default NextAuth(authOptions)
