import { env } from '@/lib/env'

import * as Sentry from '@sentry/nextjs'

export async function register() {
    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('../sentry.edge.config')
        return
    }

    await import('../sentry.server.config')

    // Loud, once-at-boot report of the coupons bridge-sync posture (W4-D3).
    // register() runs once per nodejs server boot, so this fires exactly once.
    // The app ALWAYS serves its OWN catalog (DATABASE_URL); COUPONS_DATABASE_URL
    // is now an OPTIONAL bridge-only input — absent → sync disabled. Logged
    // (never swallowed) so the posture is never a silent surprise.
    if (env.COUPONS_DATABASE_URL) {
        console.log(
            '[boot] coupons bridge sync ENABLED (COUPONS_DATABASE_URL set)',
        )
    } else {
        console.log(
            '[boot] coupons bridge sync DISABLED — serving the app-owned catalog only (COUPONS_DATABASE_URL unset)',
        )
    }
}

export const onRequestError = Sentry.captureRequestError
