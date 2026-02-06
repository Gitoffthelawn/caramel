import { auth } from '@/lib/auth/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    const body = (await req.json().catch(() => ({}))) as {
        provider?: 'google' | 'apple'
        code?: string
        state?: string
    }

    const { provider, code, state } = body

    if (!provider || !code) {
        return NextResponse.json(
            { error: 'Missing provider or code' },
            { status: 400 },
        )
    }

    if (provider !== 'google' && provider !== 'apple') {
        return NextResponse.json(
            { error: 'Invalid provider. Must be "google" or "apple"' },
            { status: 400 },
        )
    }

    try {
        // Build the callback URL that better-auth expects
        // better-auth handles OAuth callbacks at /api/auth/callback/[provider]
        const baseURL =
            process.env.BETTER_AUTH_URL ||
            process.env.NEXT_PUBLIC_BASE_URL ||
            'http://localhost:3000'

        const callbackUrl = new URL(`/api/auth/callback/${provider}`, baseURL)
        if (code) callbackUrl.searchParams.set('code', code)
        if (state) callbackUrl.searchParams.set('state', state)

        // Make an internal request to better-auth's callback endpoint
        // This will complete the OAuth flow and create a session
        const callbackResponse = await fetch(callbackUrl.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Cookie: req.headers.get('cookie') || '',
            },
        })

        if (!callbackResponse.ok) {
            const errorData = await callbackResponse.json().catch(() => ({}))
            const errorMessage =
                errorData?.message ||
                errorData?.error?.message ||
                'OAuth authentication failed'

            return NextResponse.json(
                { error: errorMessage },
                { status: callbackResponse.status },
            )
        }

        // Extract the session cookie from the callback response
        const setCookieHeader = callbackResponse.headers.get('set-cookie')
        if (!setCookieHeader) {
            return NextResponse.json(
                { error: 'Failed to establish session' },
                { status: 500 },
            )
        }

        // Extract the session token from cookies
        const sessionCookie = setCookieHeader
            .split(', ')
            .find(cookie => cookie.includes('better-auth.session_token'))

        if (!sessionCookie) {
            return NextResponse.json(
                { error: 'Failed to extract session token' },
                { status: 500 },
            )
        }

        const sessionToken = sessionCookie
            .split(';')[0]
            .split('better-auth.session_token=')[1]

        // Get the session using better-auth's API
        const sessionResponse = await auth.api.getSession({
            headers: {
                cookie: `better-auth.session_token=${sessionToken}`,
            },
        })

        if (!sessionResponse || !('data' in sessionResponse)) {
            return NextResponse.json(
                { error: 'Failed to retrieve session' },
                { status: 500 },
            )
        }

        const sessionData = sessionResponse.data as {
            user?: {
                id?: string
                email?: string
                username?: string
                name?: string
                image?: string
            }
        }

        if (!sessionData.user) {
            return NextResponse.json(
                { error: 'User not found in session' },
                { status: 500 },
            )
        }

        // Check if bearer token is in the callback response headers
        // better-auth bearer plugin should set this after successful OAuth
        let authToken = callbackResponse.headers.get('set-auth-token')

        // If no token in headers, we need to generate one
        // For OAuth users, we can't use signInEmail since they don't have passwords
        // Instead, we'll use the bearer plugin's token generation
        // Create a request to better-auth's sign-in endpoint with the session
        // to trigger token generation
        if (!authToken) {
            // Make a request to get a bearer token for this session
            // better-auth should provide a way to generate tokens from existing sessions
            // For now, we'll make a request to the sign-in endpoint with the session
            const tokenRequest = await fetch(
                `${baseURL}/api/auth/sign-in/social`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Cookie: `better-auth.session_token=${sessionToken}`,
                    },
                    body: JSON.stringify({ provider }),
                },
            )

            authToken = tokenRequest.headers.get('set-auth-token')
        }

        // If still no token, we'll need to generate one manually
        // This is a fallback - ideally better-auth would handle this
        if (!authToken) {
            // For now, return an error indicating token generation is needed
            // In a production scenario, you might want to implement custom token generation
            return NextResponse.json(
                {
                    error:
                        'Failed to generate bearer token. OAuth authentication succeeded but token generation failed.',
                },
                { status: 500 },
            )
        }

        return NextResponse.json({
            token: authToken,
            username:
                sessionData.user.username ||
                sessionData.user.name ||
                sessionData.user.email ||
                null,
            image: sessionData.user.image || null,
        })
    } catch (error) {
        console.error('OAuth error:', error)
        return NextResponse.json(
            { error: 'Internal server error during OAuth authentication' },
            { status: 500 },
        )
    }
}
