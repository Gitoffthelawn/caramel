import { checkRateLimit } from '@/lib/rateLimit'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Characterization pins (F-004) — lock CURRENT behavior of checkRateLimit
// (src/lib/rateLimit.ts). F-003 will intentionally change the extension
// exemption's shape; this pins today's contract first.
//
// Each pin uses a unique x-real-ip: the burst (20/2s) and per-minute
// limiters are module-level singletons shared by every test in this file,
// so reusing an IP across tests would leak budget between them.
const EXTENSION_KEY = 'test-extension-key-F004'

function makeRequest(ip: string, headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost/api/coupons', {
        headers: { 'x-real-ip': ip, ...headers },
    })
}

beforeEach(() => {
    vi.unstubAllEnvs()
})

describe('checkRateLimit', () => {
    it('(a) x-api-key matching EXTENSION_API_KEY stays null across 25 rapid calls (extension exemption bypasses the 20/2s burst limit)', async () => {
        vi.stubEnv('EXTENSION_API_KEY', EXTENSION_KEY)
        const ip = '203.0.113.10'

        for (let i = 0; i < 25; i++) {
            const result = await checkRateLimit(
                makeRequest(ip, { 'x-api-key': EXTENSION_KEY }),
                'read',
            )
            expect(result).toBeNull()
        }
    })

    it('(b) x-extension-api-key (back-compat header) matching EXTENSION_API_KEY also stays null across 25 rapid calls', async () => {
        vi.stubEnv('EXTENSION_API_KEY', EXTENSION_KEY)
        const ip = '203.0.113.11'

        for (let i = 0; i < 25; i++) {
            const result = await checkRateLimit(
                makeRequest(ip, { 'x-extension-api-key': EXTENSION_KEY }),
                'read',
            )
            expect(result).toBeNull()
        }
    })

    it('(c) no key, same IP: bursting past 20 calls/2s returns a 429 NextResponse', async () => {
        vi.stubEnv('EXTENSION_API_KEY', EXTENSION_KEY)
        const ip = '203.0.113.12'

        let blocked: Awaited<ReturnType<typeof checkRateLimit>> = null
        for (let i = 0; i < 25; i++) {
            const result = await checkRateLimit(makeRequest(ip), 'read')
            if (result) {
                blocked = result
                break
            }
        }

        expect(blocked).not.toBeNull()
        expect(blocked?.status).toBe(429)
        const body = await blocked?.json()
        expect(body.error).toBe('Too many requests. Please slow down.')
    })
})
