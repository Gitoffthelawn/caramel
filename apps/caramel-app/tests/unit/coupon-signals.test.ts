import { attachSignals } from '@/lib/couponSignals'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// attachSignals unit pins — the "merge, not SQL join" boundary. Mocks
// @/lib/prisma (the app Postgres the signal table lives in) so the merge
// logic is tested in isolation: empty-in short-circuits with no query,
// matching ids get their lastWorkedAt as an ISO string, and any id we hold no
// (or a null-worked) signal for resolves to null.
const { prismaMock, signalState } = vi.hoisted(() => {
    const signalState = {
        rows: [] as { couponId: string; lastWorkedAt: Date | null }[],
    }
    return {
        signalState,
        prismaMock: {
            couponSignal: {
                findMany: vi.fn(
                    async (_args: { where: unknown; select: unknown }) =>
                        signalState.rows,
                ),
            },
        },
    }
})
vi.mock('@/lib/prisma', () => ({ default: prismaMock }))

beforeEach(() => {
    signalState.rows = []
    prismaMock.couponSignal.findMany.mockClear()
})

describe('attachSignals (app-owned lastWorkedAt merge)', () => {
    it('empty input → empty output, no query issued', async () => {
        const out = await attachSignals([])

        expect(out).toEqual([])
        expect(prismaMock.couponSignal.findMany).not.toHaveBeenCalled()
    })

    it('attaches lastWorkedAt (ISO string) for a matching id, null for an unmatched one', async () => {
        const worked = new Date('2026-07-14T10:00:00.000Z')
        signalState.rows = [{ couponId: '1', lastWorkedAt: worked }]

        const out = await attachSignals([
            { id: '1', code: 'A' },
            { id: '2', code: 'B' },
        ])

        expect(out).toEqual([
            { id: '1', code: 'A', lastWorkedAt: worked.toISOString() },
            { id: '2', code: 'B', lastWorkedAt: null },
        ])
    })

    it('a signal row with a null lastWorkedAt (failures only) resolves to null', async () => {
        signalState.rows = [{ couponId: '1', lastWorkedAt: null }]

        const out = await attachSignals([{ id: '1' }])

        expect(out[0]!.lastWorkedAt).toBeNull()
    })

    it('queries only the ids on the page (findMany where couponId in ids)', async () => {
        await attachSignals([{ id: '7' }, { id: '9' }])

        expect(prismaMock.couponSignal.findMany).toHaveBeenCalledTimes(1)
        const arg = prismaMock.couponSignal.findMany.mock.calls[0]![0]
        expect(arg.where).toEqual({ couponId: { in: ['7', '9'] } })
    })
})
