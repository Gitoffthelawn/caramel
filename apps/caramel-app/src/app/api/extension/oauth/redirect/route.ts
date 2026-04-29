import { setNonceResult } from '@/lib/extension-oauth-nonce'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Parse the inner signed-state payload (without verifying — verification happens
 * downstream in /api/extension/oauth POST). We only need to read the nonce so
 * we can route Safari-flow callbacks server-side instead of forwarding to the
 * extension's redirect URI (which Safari's identity API can't capture).
 */
function readNonceFromSignedState(signedState: string): string | null {
    try {
        const [payloadB64] = signedState.split('.')
        if (!payloadB64) return null
        const payloadJson = Buffer.from(payloadB64, 'base64url').toString()
        const payload = JSON.parse(payloadJson)
        return typeof payload?.nonce === 'string' ? payload.nonce : null
    } catch {
        return null
    }
}

function readProviderFromSignedState(
    signedState: string,
): 'google' | 'apple' | null {
    try {
        const [payloadB64] = signedState.split('.')
        if (!payloadB64) return null
        const payloadJson = Buffer.from(payloadB64, 'base64url').toString()
        const payload = JSON.parse(payloadJson)
        return payload?.provider === 'google' || payload?.provider === 'apple'
            ? payload.provider
            : null
    } catch {
        return null
    }
}

function readRedirectUriFromSignedState(signedState: string): string | null {
    try {
        const [payloadB64] = signedState.split('.')
        if (!payloadB64) return null
        const payloadJson = Buffer.from(payloadB64, 'base64url').toString()
        const payload = JSON.parse(payloadJson)
        return typeof payload?.redirectUri === 'string'
            ? payload.redirectUri
            : null
    } catch {
        return null
    }
}

function htmlResponse(title: string, body: string, status = 200) {
    return new NextResponse(
        `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#fff8f0;color:#3a2818;margin:0;padding:0;display:flex;min-height:100vh;align-items:center;justify-content:center}main{max-width:420px;padding:32px 24px;text-align:center}h1{margin:0 0 12px;font-size:22px}p{margin:0 0 8px;line-height:1.5;color:#5a4030}.tag{display:inline-block;padding:4px 10px;border-radius:999px;background:#fde0c1;color:#a64a00;font-size:12px;font-weight:600;margin-bottom:16px}</style></head><body><main>${body}</main></body></html>`,
        {
            status,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        },
    )
}

async function completeSafariOauth(args: {
    baseURL: string
    provider: 'google' | 'apple'
    code: string
    state: string
    redirectUri: string
    nonce: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
        const exchangeRes = await fetch(`${args.baseURL}/api/extension/oauth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: args.provider,
                code: args.code,
                state: args.state,
                redirectUri: args.redirectUri,
            }),
        })

        if (!exchangeRes.ok) {
            const errorData = await exchangeRes.json().catch(() => ({}))
            return {
                ok: false,
                error:
                    errorData?.error ||
                    `Token exchange failed (${exchangeRes.status})`,
            }
        }

        const data = (await exchangeRes.json()) as {
            token?: string
            username?: string | null
            image?: string | null
        }

        if (!data.token) {
            return { ok: false, error: 'Missing token in exchange response' }
        }

        setNonceResult(args.nonce, {
            token: data.token,
            username: data.username ?? null,
            image: data.image ?? null,
        })

        return { ok: true }
    } catch (err) {
        return {
            ok: false,
            error:
                err instanceof Error
                    ? err.message
                    : 'Internal exchange failure',
        }
    }
}

/**
 * This endpoint handles redirects from OAuth providers (form_post from Apple,
 * direct redirect from Google when running in the Safari extension flow).
 *
 * Two flows:
 *   1. Chrome/Firefox/Edge: forward the auth code back to the extension's
 *      redirect URI (chromiumapp.org / chrome-extension://). The extension's
 *      identity API captures it.
 *   2. Safari (iOS/macOS): identity.launchWebAuthFlow isn't reliably available,
 *      so the extension passes a `nonce` to /authorize. The signed state carries
 *      the nonce here. We complete the OAuth exchange server-side and stash the
 *      result keyed by nonce for the popup to pick up via /poll.
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

    // Decode state to get extension redirect URI if it was encoded.
    // Apple form_post: state contains { r: extensionRedirectUri, s: signedState }
    // Google query: state is the signed state directly.
    let extensionRedirectUri = extensionRedirect
    let originalState = state
    if (state) {
        try {
            const decodedState = JSON.parse(
                Buffer.from(state, 'base64').toString(),
            )
            if (decodedState.r) {
                extensionRedirectUri = decodedState.r
            }
            if (decodedState.s) {
                originalState = decodedState.s
            }
        } catch {
            // Not the Apple wrapper format — state is the signed state directly.
        }
    }

    // === Safari flow detection ===
    // Inspect the signed state for an embedded nonce. If present, the popup is
    // waiting on /poll instead of capturing a redirect URL.
    const nonce = originalState ? readNonceFromSignedState(originalState) : null

    if (nonce) {
        if (error) {
            setNonceResult(nonce, {
                token: '',
                username: null,
                image: null,
            })
            // Even on error we surface a result so the popup stops polling.
            return htmlResponse(
                'Sign-in failed',
                `<span class="tag">Caramel</span><h1>Sign-in failed</h1><p>${error}</p><p>You can close this tab and try again.</p>`,
                400,
            )
        }
        if (!code) {
            return htmlResponse(
                'Sign-in failed',
                `<span class="tag">Caramel</span><h1>Sign-in failed</h1><p>Missing authorization code.</p>`,
                400,
            )
        }

        const provider = readProviderFromSignedState(originalState!)
        const stateRedirectUri = readRedirectUriFromSignedState(originalState!)

        if (!provider || !stateRedirectUri) {
            return htmlResponse(
                'Sign-in failed',
                `<span class="tag">Caramel</span><h1>Sign-in failed</h1><p>Invalid state payload.</p>`,
                400,
            )
        }

        const baseURL =
            process.env.BETTER_AUTH_URL ||
            process.env.NEXT_PUBLIC_BASE_URL ||
            new URL(req.url).origin

        const result = await completeSafariOauth({
            baseURL,
            provider,
            code,
            state: originalState!,
            redirectUri: stateRedirectUri,
            nonce,
        })

        if (!result.ok) {
            return htmlResponse(
                'Sign-in failed',
                `<span class="tag">Caramel</span><h1>Sign-in failed</h1><p>${result.error}</p><p>You can close this tab and try again.</p>`,
                400,
            )
        }

        return htmlResponse(
            'Sign-in successful',
            `<span class="tag">Caramel</span><h1>You're signed in</h1><p>Return to the Caramel extension to continue. You can close this tab.</p>`,
        )
    }

    // === Chrome / Firefox / Edge flow (existing) ===
    if (error) {
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
