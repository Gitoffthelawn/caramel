import { checkRateLimit } from '@/lib/rateLimit'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Characterization pins (F-004), flipped by F-003 — the public extension-key
// exemption is retired; a server-only COUPONS_ADMIN_SECRET bearer takes its
// place. Pins (a)/(b) now prove the OLD key-shaped headers grant NOTHING
// (the point of F-003: the shipped key stops conferring any privilege the
// instant it's deployed). Pin (c) is unchanged. Pin (d) is new: the bearer
// secret is what grants the exemption now.
//
// Each pin uses a unique x-real-ip: the burst (20/2s) and per-minute
// limiters are module-level singletons shared by every test in this file,
// so reusing an IP across tests would leak budget between them.
const STALE_EXTENSION_KEY = 'test-extension-key-F004'
const ADMIN_SECRET = 'test-admin-secret-F003'

const { envMock } = vi.hoisted(() => ({
    envMock: { COUPONS_ADMIN_SECRET: undefined as string | undefined },
}))
vi.mock('@/lib/env', () => ({ env: envMock }))

function makeRequest(ip: string, headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost/api/coupons', {
        headers: { 'x-real-ip': ip, ...headers },
    })
}

beforeEach(() => {
    envMock.COUPONS_ADMIN_SECRET = ADMIN_SECRET
})

describe('checkRateLimit', () => {
    it('(a) stale x-api-key (the old, now-retired extension key header) no longer exempts — rides burst past 20 calls/2s -> 429', async () => {
        const ip = '203.0.113.10'

        let blocked: Awaited<ReturnType<typeof checkRateLimit>> = null
        for (let i = 0; i < 25; i++) {
            const result = await checkRateLimit(
                makeRequest(ip, { 'x-api-key': STALE_EXTENSION_KEY }),
                'read',
            )
            if (result) {
                blocked = result
                break
            }
        }

        expect(blocked).not.toBeNull()
        expect(blocked?.status).toBe(429)
    })

    it('(b) stale x-extension-api-key (back-compat header) no longer exempts either — rides burst past 20 calls/2s -> 429', async () => {
        const ip = '203.0.113.11'

        let blocked: Awaited<ReturnType<typeof checkRateLimit>> = null
        for (let i = 0; i < 25; i++) {
            const result = await checkRateLimit(
                makeRequest(ip, { 'x-extension-api-key': STALE_EXTENSION_KEY }),
                'read',
            )
            if (result) {
                blocked = result
                break
            }
        }

        expect(blocked).not.toBeNull()
        expect(blocked?.status).toBe(429)
    })

    it('(c) no key, same IP: bursting past 20 calls/2s returns a 429 NextResponse', async () => {
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

    it('(d) Authorization: Bearer $COUPONS_ADMIN_SECRET stays null across 25 rapid calls (server-identity exemption)', async () => {
        const ip = '203.0.113.13'

        for (let i = 0; i < 25; i++) {
            const result = await checkRateLimit(
                makeRequest(ip, { authorization: `Bearer ${ADMIN_SECRET}` }),
                'read',
            )
            expect(result).toBeNull()
        }
    })
})
