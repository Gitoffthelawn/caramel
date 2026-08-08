// lib/relativeTime.ts
//
// Tiny, pure relative-time formatter for the app-owned "worked Xh ago" trust
// signal (W1). Deliberately dependency-free so it's safe to import into a
// 'use client' card. The extension popup carries a byte-for-byte twin
// (popup.js's own formatWorkedAgo) — the two live across the app/extension
// runtime boundary and can't share a module, so they're kept in step by hand
// (a small, deliberately-duplicated formatter, flagged on both sides).

/**
 * "worked Xh ago" / "worked Xd ago" for a lastWorkedAt ISO timestamp — whole
 * hours under a day, whole days otherwise. Returns null (render nothing) when
 * the value is absent, unparseable, in the future, or older than 7 days:
 * stale trust is no trust.
 */
export function formatWorkedAgo(iso: string | null | undefined): string | null {
    if (!iso) return null
    const then = Date.parse(iso)
    if (Number.isNaN(then)) return null

    const HOUR_MS = 60 * 60 * 1000
    const DAY_MS = 24 * HOUR_MS
    const diffMs = Date.now() - then

    // Future timestamp, or older than a week — treat both as "no signal".
    if (diffMs < 0 || diffMs > 7 * DAY_MS) return null

    if (diffMs < DAY_MS) {
        return `worked ${Math.floor(diffMs / HOUR_MS)}h ago`
    }
    return `worked ${Math.floor(diffMs / DAY_MS)}d ago`
}
