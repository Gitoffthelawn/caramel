import { NextRequest, NextResponse } from 'next/server'

/**
 * This endpoint handles redirects from better-auth's OAuth callback
 * and forwards the authorization code to the extension's redirect URI
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const extensionRedirect = searchParams.get('extension_redirect')

    // Decode state to get extension redirect URI if it was encoded
    let extensionRedirectUri = extensionRedirect
    if (state && !extensionRedirect) {
        try {
            const decodedState = JSON.parse(
                Buffer.from(state, 'base64').toString(),
            )
            if (decodedState.r) {
                extensionRedirectUri = decodedState.r
            }
        } catch {
            // State might not be our encoded format, that's okay
        }
    }

    if (error) {
        // If there's an error, redirect to extension with error
        if (extensionRedirectUri) {
            const errorUrl = new URL(extensionRedirectUri)
            errorUrl.searchParams.set('error', error)
            if (state) errorUrl.searchParams.set('state', state)
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
    const redirectUrl = new URL(extensionRedirectUri)
    redirectUrl.searchParams.set('code', code)
    if (state) redirectUrl.searchParams.set('state', state)

    return NextResponse.redirect(redirectUrl.toString())
}
