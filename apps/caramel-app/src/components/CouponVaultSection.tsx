'use client'

// CouponVaultSection — the landing page's signature 3D moment: a floating
// molten-caramel glass coupon card with orbiting chips and drifting droplets,
// reactive to mouse + scroll. This file is the DOM shell (real copy, CTA,
// poster fallback, mount/perf gating); the WebGL scene is a separate chunk
// loaded lazily so `three` never blocks first paint.
//
// Fallback matrix (brief requirement 2):
//   - prefers-reduced-motion  -> static poster, canvas never mounts
//   - WebGL unavailable        -> static poster, canvas never mounts
//   - chunk still loading      -> poster underneath, canvas fades in over it
// The reserved section height is fixed up front so there is zero CLS whether
// the canvas ever mounts or not.

import { ThemeContext } from '@/lib/contexts'
import { detectWebGL } from '@/lib/webglSupport'
import { motion, useReducedMotion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useContext, useEffect, useRef, useState } from 'react'
import { ticketNotchMask } from './couponTicket3d'

const CouponVaultScene = dynamic(() => import('./CouponVaultScene'), {
    ssr: false,
})

const revealEase: [number, number, number, number] = [0.22, 1, 0.36, 1]

// Fine film grain, inlined as an SVG data URI (no network asset) — tiled small
// and blended soft so it adds filmic depth without banding. Theme opacity is
// tuned by the caller via Tailwind classes.
const GRAIN_URL =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

// Still-beautiful CSS-only stand-in shown for reduced-motion / no-WebGL, and
// underneath the canvas while its chunk loads. aria-hidden: it is purely
// decorative — the headline, subline and CTA are real DOM below. The card is a
// coupon ticket: side notches (mask) + a dashed perforation across the axis.
function VaultPoster(): React.JSX.Element {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
        >
            <div className="absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-caramel/25 blur-3xl dark:bg-caramel/20" />
            <div className="absolute left-[38%] top-[42%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-300/30 blur-2xl" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative h-56 w-80 rotate-[-8deg]">
                    <div
                        className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-caramel via-orange-500 to-orange-600 shadow-caramel-lg"
                        style={ticketNotchMask('1.15rem', '58%')}
                    />
                    <div
                        className="absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-white/35 via-transparent to-transparent"
                        style={ticketNotchMask('1.15rem', '58%')}
                    />
                    <span className="absolute inset-x-0 top-[22%] select-none text-center text-7xl font-black text-white/90 drop-shadow-lg">
                        %
                    </span>
                    <div className="absolute inset-x-7 top-[58%] border-t-2 border-dashed border-white/70" />
                    <div
                        className="absolute -right-10 -top-8 h-16 w-24 rotate-12 rounded-2xl bg-caramelLight/90 shadow-caramel-sm"
                        style={ticketNotchMask('0.7rem', '50%')}
                    />
                    <div
                        className="absolute -bottom-8 -left-10 h-14 w-20 -rotate-12 rounded-2xl bg-orange-400/90 shadow-caramel-sm"
                        style={ticketNotchMask('0.7rem', '50%')}
                    />
                </div>
            </div>
        </div>
    )
}

export default function CouponVaultSection(): React.JSX.Element {
    const reduceMotion = useReducedMotion()
    const { isDarkMode } = useContext(ThemeContext)
    const sectionRef = useRef<HTMLElement>(null)

    // near = within 400px of viewport (mount the chunk); active = actually
    // intersecting (run the frameloop); webglOK = real GL context available;
    // canvasReady = GL context created (cross-fade the poster out).
    const [near, setNear] = useState(false)
    const [active, setActive] = useState(false)
    const [webglOK, setWebglOK] = useState(false)
    const [canvasReady, setCanvasReady] = useState(false)

    useEffect(() => {
        setWebglOK(detectWebGL())
    }, [])

    useEffect(() => {
        const el = sectionRef.current
        if (!el || reduceMotion) return

        const mountObserver = new IntersectionObserver(
            entries => {
                if (entries.some(entry => entry.isIntersecting)) {
                    setNear(true)
                    mountObserver.disconnect()
                }
            },
            { rootMargin: '400px' },
        )
        const activeObserver = new IntersectionObserver(
            entries => {
                setActive(entries.some(entry => entry.isIntersecting))
            },
            { rootMargin: '0px', threshold: 0 },
        )
        mountObserver.observe(el)
        activeObserver.observe(el)

        return () => {
            mountObserver.disconnect()
            activeObserver.disconnect()
        }
    }, [reduceMotion])

    const showCanvas = !reduceMotion && webglOK && near

    return (
        <section
            ref={sectionRef}
            id="see-it-work"
            className="relative flex min-h-[88vh] flex-col justify-end overflow-hidden px-6 py-20 md:min-h-[80vh] sm:px-5"
        >
            {/* Poster: fallback + load-time backdrop; fades out once the GL
                context exists so only the live scene shows over the page. */}
            <div
                className="transition-opacity duration-700 ease-out"
                style={{ opacity: canvasReady ? 0 : 1 }}
            >
                <VaultPoster />
            </div>

            {showCanvas && (
                <div
                    aria-hidden="true"
                    className="absolute inset-0 transition-opacity duration-700 ease-out"
                    style={{ opacity: canvasReady ? 1 : 0 }}
                >
                    <CouponVaultScene
                        active={active}
                        isDark={isDarkMode}
                        onReady={() => setCanvasReady(true)}
                    />
                </div>
            )}

            {/* Filmic depth: a soft vignette (theme-tuned) plus a faint tiled
                grain, both purely decorative and above the art but under the
                copy (z-10), so text stays crisp. */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(120,60,20,0.10)_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(0,0,0,0.5)_100%)]"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-[1] opacity-[0.06] mix-blend-soft-light dark:opacity-[0.1]"
                style={{
                    backgroundImage: GRAIN_URL,
                    backgroundSize: '120px 120px',
                }}
            />

            {/* Real, keyboard-reachable copy — always server-rendered. The
                halo keeps text readable wherever the orbiting tickets drift. */}
            <div className="relative z-10 mx-auto w-full max-w-3xl text-center">
                <div
                    aria-hidden="true"
                    className="absolute -inset-x-10 -inset-y-8 -z-10 rounded-full bg-white/75 blur-2xl dark:bg-black/40"
                />
                <motion.p
                    initial={
                        reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }
                    }
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '0px 0px -80px 0px' }}
                    transition={{ duration: 0.6, ease: revealEase }}
                    className="mb-4 inline-block rounded-full border border-caramel/20 bg-white/85 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.2em] text-caramel backdrop-blur-md dark:bg-black/60"
                >
                    Welcome to Caramel
                </motion.p>
                <motion.h2
                    initial={
                        reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }
                    }
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '0px 0px -80px 0px' }}
                    transition={{
                        duration: 0.7,
                        delay: 0.05,
                        ease: revealEase,
                    }}
                    className="text-6xl font-extrabold tracking-tight text-gray-900 drop-shadow-sm dark:text-white lg:text-5xl md:text-4xl"
                >
                    Welcome to checkout that pays you back.
                </motion.h2>
                <motion.p
                    initial={
                        reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }
                    }
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '0px 0px -80px 0px' }}
                    transition={{
                        duration: 0.7,
                        delay: 0.15,
                        ease: revealEase,
                    }}
                    className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-700 dark:text-gray-200 md:text-base"
                >
                    Caramel tests every code at checkout and keeps the biggest
                    discount — no tab-hopping, no tracking, no hijacked creator
                    commissions.
                </motion.p>
                <motion.div
                    initial={
                        reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }
                    }
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '0px 0px -80px 0px' }}
                    transition={{
                        duration: 0.7,
                        delay: 0.25,
                        ease: revealEase,
                    }}
                    className="mt-10 flex justify-center"
                >
                    <motion.a
                        href="#install-extension"
                        className="rounded-full bg-gradient-to-r from-caramel to-orange-600 px-8 py-4 font-semibold text-black shadow-caramel-lg outline-none transition-all duration-300 hover:from-orange-600 hover:to-caramel hover:shadow-xl focus-visible:ring-2 focus-visible:ring-caramel focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-darkBg"
                        whileHover={{
                            scale: 1.05,
                            boxShadow: '0 20px 40px rgba(234,105,37,0.35)',
                        }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Add Caramel — it&apos;s free
                    </motion.a>
                </motion.div>
            </div>
        </section>
    )
}
