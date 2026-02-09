import { NextRequest, NextResponse } from 'next/server'

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(req: NextRequest) {
    const origin = req.headers.get('origin')
    const isExtensionOrigin =
        origin?.startsWith('chrome-extension://') ||
        origin?.startsWith('moz-extension://') ||
        origin?.startsWith('safari-web-extension://')

    const headers = new Headers()
    if (isExtensionOrigin && origin) {
        headers.set('Access-Control-Allow-Origin', origin)
        headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
        headers.set('Access-Control-Allow-Headers', 'Content-Type')
    }

    return new NextResponse(null, { status: 204, headers })
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const provider = searchParams.get('provider') as 'google' | 'apple' | null
    const redirectUri = searchParams.get('redirect_uri')

    console.log('OAuth authorize request:', { provider, redirectUri })

    // Helper to get CORS headers
    const getCorsHeaders = () => {
        const headers = new Headers()
        const origin = req.headers.get('origin')
        const isExtensionOrigin =
            origin?.startsWith('chrome-extension://') ||
            origin?.startsWith('moz-extension://') ||
            origin?.startsWith('safari-web-extension://')

        if (isExtensionOrigin && origin) {
            headers.set('Access-Control-Allow-Origin', origin)
            headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
            headers.set('Access-Control-Allow-Headers', 'Content-Type')
        }
        return headers
    }

    const corsHeaders = getCorsHeaders()

    if (!provider) {
        return NextResponse.json(
            { error: 'Missing provider parameter' },
            { status: 400, headers: corsHeaders },
        )
    }

    if (provider !== 'google' && provider !== 'apple') {
        return NextResponse.json(
            { error: 'Invalid provider. Must be "google" or "apple"' },
            { status: 400, headers: corsHeaders },
        )
    }

    if (!redirectUri) {
        return NextResponse.json(
            { error: 'Missing redirect_uri parameter' },
            { status: 400, headers: corsHeaders },
        )
    }

    try {
        const baseURL =
            process.env.BETTER_AUTH_URL ||
            process.env.NEXT_PUBLIC_BASE_URL ||
            'http://localhost:3000'

        // Construct OAuth URLs directly using OAuth provider endpoints
        // This bypasses better-auth's redirect handling which doesn't work well for extensions
        let oauthUrl: URL
        let state: string

        // Generate state for CSRF protection
        // Use a simple base64 encoding that works in Node.js
        const stateString = `${Date.now()}-${Math.random()}`
        state = Buffer.from(stateString).toString('base64')

        if (provider === 'google') {
            // Google OAuth 2.0 authorization endpoint
            const googleClientId = process.env.GOOGLE_CLIENT_ID
            if (!googleClientId) {
                return NextResponse.json(
                    { error: 'Google OAuth not configured' },
                    { status: 500, headers: corsHeaders },
                )
            }

            // IMPORTANT: For Chrome extensions, we MUST use the extension's redirect URI
            // This URI format is: https://[extension-id].chromiumapp.org/
            // This MUST be registered in Google Cloud Console as an authorized redirect URI
            //
            // We cannot use better-auth's callback URL because better-auth manages its own
            // state verification, and we need to bypass that for extension flows.
            oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
            oauthUrl.searchParams.set('client_id', googleClientId)
            oauthUrl.searchParams.set('redirect_uri', redirectUri) // Use extension's redirect URI directly
            oauthUrl.searchParams.set('response_type', 'code')
            oauthUrl.searchParams.set('scope', 'openid email profile')
            oauthUrl.searchParams.set('access_type', 'offline')
            oauthUrl.searchParams.set('prompt', 'select_account')
            oauthUrl.searchParams.set('state', state) // Use our own state (not better-auth's)

            const authUrl = oauthUrl.toString()
            console.log(
                'Generated OAuth URL for',
                provider,
                ':',
                authUrl.substring(0, 100) + '...',
            )
            console.log('Using extension redirect URI:', redirectUri)
            console.log(
                'NOTE: This redirect URI must be registered in Google Cloud Console',
            )

            // Return the state for the extension to verify
            return NextResponse.json(
                {
                    authorizationUrl: authUrl,
                    state, // Return original state
                },
                { headers: corsHeaders },
            )
        } else if (provider === 'apple') {
            // Apple OAuth 2.0 authorization endpoint
            const appleClientId = process.env.APPLE_CLIENT_ID
            if (!appleClientId) {
                return NextResponse.json(
                    { error: 'Apple OAuth not configured' },
                    { status: 500, headers: corsHeaders },
                )
            }

            // Apple requires HTTPS redirect URIs (doesn't accept localhost or HTTP)
            if (!baseURL.startsWith('https://')) {
                return NextResponse.json(
                    {
                        error: 'Apple OAuth requires HTTPS. Please set BETTER_AUTH_URL or NEXT_PUBLIC_BASE_URL to your HTTPS URL (e.g., ngrok URL).',
                        details: `Current baseURL: ${baseURL}. Apple does not accept HTTP or localhost redirect URIs.`,
                    },
                    { status: 400, headers: corsHeaders },
                )
            }

            // Apple requires form_post when requesting 'email' or 'name' scope
            // Since chrome.identity can't handle form_post directly, we use an intermediate redirect endpoint
            // that receives the POST from Apple and redirects to the extension's redirect URI
            const intermediateRedirectUri = `${baseURL}/api/extension/oauth/redirect`

            // Encode the extension redirect URI in the state so we can retrieve it after Apple POSTs back
            // Apple will POST the state back to us, and we'll decode it to get the extension redirect URI
            const stateWithRedirect = Buffer.from(
                JSON.stringify({ r: redirectUri, s: state }),
            ).toString('base64')

            oauthUrl = new URL('https://appleid.apple.com/auth/authorize')
            oauthUrl.searchParams.set('client_id', appleClientId)
            oauthUrl.searchParams.set('redirect_uri', intermediateRedirectUri)
            oauthUrl.searchParams.set('response_type', 'code')
            oauthUrl.searchParams.set('scope', 'email')
            oauthUrl.searchParams.set('response_mode', 'form_post') // Required by Apple for email scope
            oauthUrl.searchParams.set('state', stateWithRedirect)

            const authUrl = oauthUrl.toString()
            console.log(
                'Generated OAuth URL for',
                provider,
                ':',
                authUrl.substring(0, 100) + '...',
            )
            console.log('Extension redirect URI:', redirectUri)
            console.log('Intermediate redirect URI:', intermediateRedirectUri)

            // Return the original state (not the encoded one) for the extension to verify
            return NextResponse.json(
                {
                    authorizationUrl: authUrl,
                    state, // Return original state for extension to verify
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
        console.error('OAuth authorization URL error:', error)
        // Re-create CORS headers in catch block
        const headers = new Headers()
        const origin = req.headers.get('origin')
        const isExtensionOrigin =
            origin?.startsWith('chrome-extension://') ||
            origin?.startsWith('moz-extension://') ||
            origin?.startsWith('safari-web-extension://')

        if (isExtensionOrigin && origin) {
            headers.set('Access-Control-Allow-Origin', origin)
            headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
            headers.set('Access-Control-Allow-Headers', 'Content-Type')
        }

        return NextResponse.json(
            {
                error: `Internal server error while getting OAuth URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
            { status: 500, headers },
        )
    }
}
