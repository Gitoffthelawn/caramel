// heroStats — the three hero stats plus the count-up hook, shared by BOTH the
// 3D stat coupons (HeroTicketScene, rendered in WebGL on desktop) and the DOM
// stat-card fallback (HeroSection, shown on mobile / reduced-motion / no-WebGL)
// so the numbers, labels and animation stay in ONE place. No `three` import
// here — safe to pull into the main bundle via the DOM fallback.

import { useEffect, useState } from 'react'

export interface HeroStat {
    value: number
    suffix: string
    label: string
    format?: 'comma'
}

// Same size for all three (deliberate — a uniform row reads cleaner than mixed
// sizes). Order = left→right / first→last.
export const HERO_STATS: HeroStat[] = [
    { value: 5000, suffix: '+', label: 'Supported Stores', format: 'comma' },
    { value: 100, suffix: '%', label: 'Open Source' },
    { value: 0, suffix: '%', label: 'Data Selling' },
]

export function formatStat(value: number, stat: HeroStat): string {
    const rounded = Math.round(value)
    const num =
        stat.format === 'comma' ? rounded.toLocaleString('en-US') : `${rounded}`
    return `${num}${stat.suffix}`
}

// Count a value up from 0 to `target` with an easeOutCubic ramp once `start`
// flips true (first paint). reduced-motion / SSR shows the final value with no
// animation. rAF math runs only inside the effect, never during render.
export function useCountUp(
    target: number,
    start: boolean,
    reduce: boolean,
): number {
    const [val, setVal] = useState(reduce ? target : 0)
    useEffect(() => {
        if (!start) return
        if (reduce) {
            setVal(target)
            return
        }
        let raf = 0
        const duration = 1200
        const t0 = performance.now()
        const tick = (now: number): void => {
            const p = Math.min(1, (now - t0) / duration)
            const eased = 1 - Math.pow(1 - p, 3)
            setVal(target * eased)
            if (p < 1) raf = requestAnimationFrame(tick)
            else setVal(target)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [target, start, reduce])
    return val
}
