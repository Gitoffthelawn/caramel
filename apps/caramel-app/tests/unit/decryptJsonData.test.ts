import { decryptJsonClient } from '@/lib/securityHelpers/cryptoHelpers'
import { decryptJsonData } from '@/lib/securityHelpers/decryptJsonData'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Characterization pins (F-004) — lock CURRENT behavior of decryptJsonData
// (src/lib/securityHelpers/decryptJsonData.ts:20-22), warts included.
// F-002 will intentionally change pin (c): today a decrypt failure silently
// hands back the still-encrypted payload instead of surfacing an error.
vi.mock('@/lib/securityHelpers/cryptoHelpers')

beforeEach(() => {
    vi.unstubAllEnvs()
    vi.mocked(decryptJsonClient).mockReset()
})

describe('decryptJsonData', () => {
    it('(a) encryption disabled: returns pageData || response || raw, unwrapped', () => {
        vi.stubEnv('NEXT_PUBLIC_API_ENCRYPTION_ENABLED', 'false')

        expect(decryptJsonData({ pageData: 'PAGE', response: 'RESP' })).toBe(
            'PAGE',
        )
        expect(decryptJsonData({ response: 'RESP' })).toBe('RESP')

        const raw = { other: 'x' }
        expect(decryptJsonData(raw)).toBe(raw)
        expect(decryptJsonClient).not.toHaveBeenCalled()
    })

    it('(b) encryption enabled, neither pageData nor response present: returns raw untouched', () => {
        vi.stubEnv('NEXT_PUBLIC_API_ENCRYPTION_ENABLED', 'true')

        const raw = { foo: 'bar' }
        expect(decryptJsonData(raw)).toBe(raw)
        expect(decryptJsonClient).not.toHaveBeenCalled()
    })

    it('(c) WART: encryption enabled + decryptJsonClient throws -> silently returns the raw (still-encrypted) payload', () => {
        vi.stubEnv('NEXT_PUBLIC_API_ENCRYPTION_ENABLED', 'true')
        vi.mocked(decryptJsonClient).mockImplementation(() => {
            throw new Error('bad ciphertext')
        })

        const raw = { response: 'STILL-ENCRYPTED-BLOB' }
        expect(decryptJsonData(raw)).toBe(raw)
        expect(decryptJsonClient).toHaveBeenCalledWith('STILL-ENCRYPTED-BLOB')
    })
})
