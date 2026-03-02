import { NextRequest, NextResponse } from 'next/server'

/**
 * This endpoint handles redirects from OAuth providers (including form_post from Apple)
 * and forwards the authorization code to the extension's redirect URI
 */
async function handleRedirect(req: NextRequest) {
    let code: string | null = null
    let state: string | null = null
    let error: string | null = null
    const extensionRedirect = req.nextUrl.searchParams.get('extension_redirect')

    // Handle POST (form_post from Apple) or GET (query from Google)
    if (req.method === 'POST') {
        const formData = await req.formData()
        code = formData.get('code') as string | null
        state = formData.get('state') as string | null
        error = formData.get('error') as string | null
    } else {
        const { searchParams } = new URL(req.url)
        code = searchParams.get('code')
        state = searchParams.get('state')
        error = searchParams.get('error')
    }

    // Decode state to get extension redirect URI if it was encoded
    // For Apple (form_post), the state contains { r: extensionRedirectUri, s: originalState }
    // For Google (query), extensionRedirect may be in query params or we use state as-is
    let extensionRedirectUri = extensionRedirect
    let originalState = state
    if (state) {
        try {
            const decodedState = JSON.parse(
                Buffer.from(state, 'base64').toString(),
            )
            // If state contains encoded redirect URI, use it (Apple form_post flow)
            if (decodedState.r) {
                extensionRedirectUri = decodedState.r
            }
            if (decodedState.s) {
                originalState = decodedState.s
            }
        } catch {
            // State is not our encoded format, use it as-is (Google query flow or fallback)
            if (!extensionRedirectUri) {
                // If no extension redirect URI provided and state is not encoded,
                // this might be an error case
            }
        }
    }

    if (error) {
        // If there's an error, redirect to extension with error
        if (extensionRedirectUri) {
            const errorUrl = new URL(extensionRedirectUri)
            errorUrl.searchParams.set('error', error)
            if (originalState) errorUrl.searchParams.set('state', originalState)
            return NextResponse.redirect(errorUrl.toString())
        }
        return NextResponse.json({ error }, { status: 400 })
    }

    if (!code) {
        return NextResponse.json(
            { error: 'Missing authorization code' },
            { status: 400 },
        )
    }

    if (!extensionRedirectUri) {
        return NextResponse.json(
            { error: 'Missing extension redirect URI' },
            { status: 400 },
        )
    }

    // Redirect to extension's redirect URI with the code
    // Use originalState (which may be the decoded state from Apple's response)
    let redirectUrl: URL
    try {
        redirectUrl = new URL(extensionRedirectUri)
    } catch {
        return NextResponse.json(
            { error: 'Invalid extension redirect URI' },
            { status: 400 },
        )
    }

    const isChromeExtension = redirectUrl.protocol === 'chrome-extension:'
    const isChromiumAppOrigin =
        redirectUrl.protocol === 'https:' &&
        redirectUrl.hostname.endsWith('.chromiumapp.org')

    if (!isChromeExtension && !isChromiumAppOrigin) {
        return NextResponse.json(
            { error: 'Disallowed extension redirect origin' },
            { status: 400 },
        )
    }

    redirectUrl.searchParams.set('code', code)
    if (originalState) redirectUrl.searchParams.set('state', originalState)

    return NextResponse.redirect(redirectUrl.toString())
}

export async function GET(req: NextRequest) {
    return handleRedirect(req)
}

export async function POST(req: NextRequest) {
    return handleRedirect(req)
}
