import { formatWorkedAgo } from '@/lib/relativeTime'
import { describe, expect, it } from 'vitest'

// Boundary pins for the "worked Xh ago" formatter (W1). Timestamps are built
// as offsets from the real Date.now() (which formatWorkedAgo reads again
// internally); every offset sits far from an h/d or 7-day boundary, so the
// sub-millisecond gap between constructing the ISO and formatting it can never
// flip a floor() result — no fake timers needed.
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

function ago(ms: number): string {
    return new Date(Date.now() - ms).toISOString()
}

describe('formatWorkedAgo', () => {
    it('null / undefined → null', () => {
        expect(formatWorkedAgo(null)).toBeNull()
        expect(formatWorkedAgo(undefined)).toBeNull()
    })

    it('an unparseable value → null', () => {
        expect(formatWorkedAgo('not-a-date')).toBeNull()
    })

    it('1h ago → "worked 1h ago"', () => {
        expect(formatWorkedAgo(ago(HOUR))).toBe('worked 1h ago')
    })

    it('23h ago → "worked 23h ago" (still whole hours under a day)', () => {
        expect(formatWorkedAgo(ago(23 * HOUR))).toBe('worked 23h ago')
    })

    it('25h ago → "worked 1d ago" (crosses into whole days)', () => {
        expect(formatWorkedAgo(ago(25 * HOUR))).toBe('worked 1d ago')
    })

    it('6d ago → "worked 6d ago" (still within the 7-day trust window)', () => {
        expect(formatWorkedAgo(ago(6 * DAY))).toBe('worked 6d ago')
    })

    it('8d ago → null (older than the 7-day trust ceiling)', () => {
        expect(formatWorkedAgo(ago(8 * DAY))).toBeNull()
    })

    it('a future timestamp → null (no signal)', () => {
        expect(
            formatWorkedAgo(new Date(Date.now() + HOUR).toISOString()),
        ).toBeNull()
    })
})
