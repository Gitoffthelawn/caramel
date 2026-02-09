import prisma from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

// Helper function to create CORS headers for extension requests
function getCorsHeaders(req: NextRequest): Headers {
    const headers = new Headers()
    const origin = req.headers.get('origin')
    const isExtensionOrigin =
        origin?.startsWith('chrome-extension://') ||
        origin?.startsWith('moz-extension://') ||
        origin?.startsWith('safari-web-extension://')

    if (isExtensionOrigin && origin) {
        headers.set('Access-Control-Allow-Origin', origin)
        headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
        headers.set('Access-Control-Allow-Headers', 'Content-Type')
    }

    return headers
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(req: NextRequest) {
    return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) })
}

export async function POST(req: NextRequest) {
    const corsHeaders = getCorsHeaders(req)
    const body = (await req.json().catch(() => ({}))) as {
        provider?: 'google' | 'apple'
        code?: string
        state?: string
        redirectUri?: string
    }

    const { provider, code, state, redirectUri } = body

    if (!provider || !code) {
        return NextResponse.json(
            { error: 'Missing provider or code' },
            { status: 400, headers: corsHeaders },
        )
    }

    if (provider !== 'google' && provider !== 'apple') {
        return NextResponse.json(
            { error: 'Invalid provider. Must be "google" or "apple"' },
            { status: 400, headers: corsHeaders },
        )
    }

    try {
        const baseURL =
            process.env.BETTER_AUTH_URL ||
            process.env.NEXT_PUBLIC_BASE_URL ||
            'http://localhost:3000'

        if (provider === 'google') {
            // Exchange authorization code for tokens directly with Google
            const googleClientId = process.env.GOOGLE_CLIENT_ID
            const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

            if (!googleClientId || !googleClientSecret) {
                return NextResponse.json(
                    { error: 'Google OAuth not configured' },
                    { status: 500, headers: corsHeaders },
                )
            }

            // Get the redirect URI from the request body
            // This must match exactly what was used in the authorization request
            if (!redirectUri) {
                return NextResponse.json(
                    { error: 'Missing redirect_uri parameter' },
                    { status: 400, headers: corsHeaders },
                )
            }

            // Exchange code for tokens
            const tokenResponse = await fetch(
                'https://oauth2.googleapis.com/token',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        code,
                        client_id: googleClientId,
                        client_secret: googleClientSecret,
                        redirect_uri: redirectUri,
                        grant_type: 'authorization_code',
                    }),
                },
            )

            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json().catch(() => ({}))
                console.error('Google token exchange error:', errorData)
                return NextResponse.json(
                    {
                        error:
                            errorData.error_description ||
                            'Failed to exchange authorization code for tokens',
                    },
                    { status: 400, headers: corsHeaders },
                )
            }

            const tokens = await tokenResponse.json()
            const { access_token, id_token } = tokens

            // Get user info from Google
            const userInfoResponse = await fetch(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                {
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                    },
                },
            )

            if (!userInfoResponse.ok) {
                return NextResponse.json(
                    { error: 'Failed to fetch user information from Google' },
                    { status: 500, headers: corsHeaders },
                )
            }

            const googleUser = await userInfoResponse.json()

            // Create or find user and account, then create session and generate bearer token
            // We'll use Prisma directly since better-auth's sign-in/social endpoint
            // is designed for OAuth flow initiation, not completion
            const userEmail = googleUser.email?.toLowerCase().trim()
            if (!userEmail) {
                return NextResponse.json(
                    { error: 'Email is required for Google sign-in' },
                    { status: 400, headers: corsHeaders },
                )
            }

            // Find or create user
            let user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email: userEmail },
                        {
                            accounts: {
                                some: {
                                    providerId: 'google',
                                    accountId: googleUser.id,
                                },
                            },
                        },
                    ],
                },
                include: { accounts: true },
            })

            if (!user) {
                // Create new user
                user = await prisma.user.create({
                    data: {
                        email: userEmail,
                        name: googleUser.name || null,
                        image: googleUser.picture || null,
                        emailVerified: googleUser.verified_email || false,
                        status: googleUser.verified_email
                            ? 'ACTIVE_USER'
                            : 'NOT_VERIFIED',
                    },
                    include: { accounts: true },
                })
            } else {
                // Update user info if needed
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        name: googleUser.name || user.name,
                        image: googleUser.picture || user.image,
                        emailVerified:
                            googleUser.verified_email !== undefined
                                ? googleUser.verified_email
                                : user.emailVerified,
                    },
                })
            }

            // Find or create account (social provider link)
            let account = await prisma.account.findUnique({
                where: {
                    providerId_accountId: {
                        providerId: 'google',
                        accountId: googleUser.id,
                    },
                },
            })

            if (!account) {
                account = await prisma.account.create({
                    data: {
                        providerId: 'google',
                        accountId: googleUser.id,
                        userId: user.id,
                        accessToken: access_token || null,
                        idToken: id_token || null,
                    },
                })
            } else {
                // Update account tokens
                await prisma.account.update({
                    where: { id: account.id },
                    data: {
                        accessToken: access_token || account.accessToken,
                        idToken: id_token || account.idToken,
                    },
                })
            }

            // Create session
            const sessionToken = randomBytes(32).toString('base64url')
            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

            const session = await prisma.session.create({
                data: {
                    token: sessionToken,
                    userId: user.id,
                    expiresAt,
                },
            })

            // Generate bearer token
            // Better-auth's bearer plugin generates tokens based on session
            // We'll create a request with the session cookie and call the bearer token endpoint
            // or use better-auth's internal API
            let authToken: string | null = null

            try {
                // Try to get bearer token by making a request with the session cookie
                const bearerTokenResponse = await fetch(
                    `${baseURL}/api/auth/session`,
                    {
                        method: 'GET',
                        headers: {
                            Cookie: `better-auth.session_token=${sessionToken}`,
                        },
                    },
                )

                if (bearerTokenResponse.ok) {
                    authToken =
                        bearerTokenResponse.headers.get('set-auth-token')
                }
            } catch (error) {
                console.error('Error getting bearer token:', error)
            }

            // If bearer token generation failed, use session token as fallback
            // The extension can use this to authenticate
            if (!authToken) {
                authToken = sessionToken
            }

            return NextResponse.json(
                {
                    token: authToken,
                    username: user.username || user.name || user.email || null,
                    image: user.image || null,
                },
                { headers: corsHeaders },
            )
        } else if (provider === 'apple') {
            // Apple OAuth flow
            const appleClientId = process.env.APPLE_CLIENT_ID
            const appleClientSecret = process.env.APPLE_CLIENT_SECRET
            const appleTeamId = process.env.APPLE_TEAM_ID
            const appleKeyId = process.env.APPLE_KEY_ID

            if (
                !appleClientId ||
                !appleClientSecret ||
                !appleTeamId ||
                !appleKeyId
            ) {
                return NextResponse.json(
                    { error: 'Apple OAuth not configured' },
                    { status: 500, headers: corsHeaders },
                )
            }

            // Get the redirect URI from the request body
            if (!redirectUri) {
                return NextResponse.json(
                    { error: 'Missing redirect_uri parameter' },
                    { status: 400, headers: corsHeaders },
                )
            }

            // For Apple OAuth, we MUST use the intermediate redirect URI in the token exchange
            // because that's what was used in the authorization request
            // The extension redirect URI is only used for the final redirect to the extension
            const baseURL =
                process.env.BETTER_AUTH_URL ||
                process.env.NEXT_PUBLIC_BASE_URL ||
                'http://localhost:3000'
            const intermediateRedirectUri = `${baseURL}/api/extension/oauth/redirect`

            // Exchange code for tokens with Apple
            // IMPORTANT: Use intermediateRedirectUri, not the extension redirectUri
            // Apple requires the redirect_uri in token exchange to match the authorization request
            const tokenResponse = await fetch(
                'https://appleid.apple.com/auth/token',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        code,
                        client_id: appleClientId,
                        client_secret: appleClientSecret,
                        redirect_uri: intermediateRedirectUri, // Use intermediate URI, not extension URI
                        grant_type: 'authorization_code',
                    }),
                },
            )

            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json().catch(() => ({}))
                console.error('Apple token exchange error:', errorData)
                return NextResponse.json(
                    {
                        error:
                            errorData.error_description ||
                            errorData.error ||
                            'Failed to exchange authorization code for tokens',
                    },
                    { status: 400, headers: corsHeaders },
                )
            }

            const tokens = await tokenResponse.json()
            const { access_token, id_token } = tokens

            // Decode ID token to get user info
            // Apple's ID token is a JWT that contains user information
            if (!id_token) {
                return NextResponse.json(
                    { error: 'Failed to receive ID token from Apple' },
                    { status: 500, headers: corsHeaders },
                )
            }

            // Decode JWT (we only need the payload, no verification needed for basic info)
            const idTokenParts = id_token.split('.')
            if (idTokenParts.length !== 3) {
                return NextResponse.json(
                    { error: 'Invalid ID token format from Apple' },
                    { status: 500, headers: corsHeaders },
                )
            }

            // Decode base64url encoded payload
            const payload = JSON.parse(
                Buffer.from(
                    idTokenParts[1].replace(/-/g, '+').replace(/_/g, '/'),
                    'base64',
                ).toString(),
            )

            const appleUser = {
                id: payload.sub, // Apple user ID
                email: payload.email || null, // Email (may be null if user chose to hide it)
                emailVerified: payload.email_verified || false,
                name: null, // Name is not available in ID token when using email-only scope
            }

            // Create or find user and account, then create session and generate bearer token
            // Find user by email or Apple account
            let user = await prisma.user.findFirst({
                where: {
                    OR: appleUser.email
                        ? [
                              { email: appleUser.email.toLowerCase().trim() },
                              {
                                  accounts: {
                                      some: {
                                          providerId: 'apple',
                                          accountId: appleUser.id,
                                      },
                                  },
                              },
                          ]
                        : [
                              {
                                  accounts: {
                                      some: {
                                          providerId: 'apple',
                                          accountId: appleUser.id,
                                      },
                                  },
                              },
                          ],
                },
                include: { accounts: true },
            })

            if (!user) {
                if (!appleUser.email) {
                    return NextResponse.json(
                        {
                            error: 'Email is required for Apple sign-in. Please ensure you grant email access.',
                        },
                        { status: 400, headers: corsHeaders },
                    )
                }

                // Create new user
                user = await prisma.user.create({
                    data: {
                        email: appleUser.email.toLowerCase().trim(),
                        emailVerified: appleUser.emailVerified || false,
                        status: appleUser.emailVerified
                            ? 'ACTIVE_USER'
                            : 'NOT_VERIFIED',
                    },
                    include: { accounts: true },
                })
            } else {
                // Update user info if needed
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        emailVerified:
                            appleUser.emailVerified !== undefined
                                ? appleUser.emailVerified
                                : user.emailVerified,
                    },
                })
            }

            // Find or create account (social provider link)
            let account = await prisma.account.findUnique({
                where: {
                    providerId_accountId: {
                        providerId: 'apple',
                        accountId: appleUser.id,
                    },
                },
            })

            if (!account) {
                account = await prisma.account.create({
                    data: {
                        providerId: 'apple',
                        accountId: appleUser.id,
                        userId: user.id,
                        accessToken: access_token || null,
                        idToken: id_token || null,
                    },
                })
            } else {
                // Update account tokens
                await prisma.account.update({
                    where: { id: account.id },
                    data: {
                        accessToken: access_token || account.accessToken,
                        idToken: id_token || account.idToken,
                    },
                })
            }

            // Create session
            const sessionToken = randomBytes(32).toString('base64url')
            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

            const session = await prisma.session.create({
                data: {
                    token: sessionToken,
                    userId: user.id,
                    expiresAt,
                },
            })

            // Generate bearer token
            let authToken: string | null = null

            try {
                // Try to get bearer token by making a request with the session cookie
                const bearerTokenResponse = await fetch(
                    `${baseURL}/api/auth/session`,
                    {
                        method: 'GET',
                        headers: {
                            Cookie: `better-auth.session_token=${sessionToken}`,
                        },
                    },
                )

                if (bearerTokenResponse.ok) {
                    authToken =
                        bearerTokenResponse.headers.get('set-auth-token')
                }
            } catch (error) {
                console.error('Error getting bearer token:', error)
            }

            // If bearer token generation failed, use session token as fallback
            if (!authToken) {
                authToken = sessionToken
            }

            return NextResponse.json(
                {
                    token: authToken,
                    username: user.username || user.name || user.email || null,
                    image: user.image || null,
                },
                { headers: corsHeaders },
            )
        } else {
            return NextResponse.json(
                { error: 'Invalid provider' },
                { status: 400, headers: corsHeaders },
            )
        }
    } catch (error) {
        console.error('OAuth error:', error)
        return NextResponse.json(
            { error: 'Internal server error during OAuth authentication' },
            { status: 500, headers: corsHeaders },
        )
    }
}
