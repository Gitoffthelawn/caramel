import { env } from '@/lib/env'
import { createHash, timingSafeEqual } from 'node:crypto'

export interface HealthResult {
    status: 'ok' | 'error'
    service: string
    latencyMs: number
    details?: string
}

export async function timedCheck(
    service: string,
    check: () => Promise<string | void>,
): Promise<HealthResult> {
    const start = Date.now()
    try {
        const details = await check()
        return {
            status: 'ok',
            service,
            latencyMs: Date.now() - start,
            ...(details ? { details } : {}),
        }
    } catch (err) {
        return {
            status: 'error',
            service,
            latencyMs: Date.now() - start,
            details: err instanceof Error ? err.message : String(err),
        }
    }
}

export function authorize(request: Request): boolean {
    const secret = env.UPKUMA_HEALTH_SECRET
    if (!secret) return false
    const auth = request.headers.get('authorization') || ''
    // Constant-time comparison: hash both sides to fixed-length 32-byte
    // SHA-256 digests before timingSafeEqual (which THROWS on length-
    // mismatched inputs), so neither the match result nor the secret's
    // length leaks through a timing side-channel — the same digest-compare
    // pattern as rateLimit.ts's isTrustedServer(). Fail-closed semantics
    // are unchanged: an unset secret (handled above), a missing header,
    // and a malformed/wrong header all return false (→ the route's 401).
    const provided = createHash('sha256').update(auth).digest()
    const expected = createHash('sha256').update(`Bearer ${secret}`).digest()
    return timingSafeEqual(provided, expected)
}
