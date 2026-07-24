'use client'

// HeroSection — split hero. On desktop (lg+ = the UNPREFIXED base, since this
// repo's Tailwind screens are max-width/desktop-first) the existing hero copy
// aligns LEFT (~55%) and an interactive 3D caramel coupon fills the RIGHT
// (~45%). Below lg it collapses to the original single centered column and the
// 3D canvas never mounts at all — phones pay zero WebGL cost.
//
// "Not heavy" gating (brief): the HeroTicketScene chunk (`three`) is a separate
// next/dynamic ssr:false component mounted ONLY once every gate passes — the
// browser is idle (requestIdleCallback, setTimeout fallback) AND a real WebGL
// context exists AND motion is allowed AND the viewport is lg+ (matchMedia,
// re-checked on resize). Until then the right column shows a premium CSS ticket
// poster (shared ticketNotchMask). The right column reserves its box up front,
// and the live canvas cross-fades in over the poster, so there is zero CLS.
// The scene's frameloop is paused (frameloop='never') whenever the hero is
// scrolled out of view via an IntersectionObserver.

import { ThemeContext } from '@/lib/contexts'
import { ticketNotchMask } from '@/lib/ticketMask'
import { detectWebGL } from '@/lib/webglSupport'
import { motion, useReducedMotion } from 'framer-motion'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import React, { useContext, useEffect, useRef, useState } from 'react'
import { FaGithub } from 'react-icons/fa'

const HeroTicketScene = dynamic(() => import('./HeroTicketScene'), {
    ssr: false,
})

const revealEase: [number, number, number, number] = [0.22, 1, 0.36, 1]

// Still-beautiful CSS-only stand-in shown until (or instead of) the live scene:
// reduced-motion / no-WebGL / non-desktop, and underneath the canvas while its
// chunk loads. aria-hidden — purely decorative; the real headline/links are DOM
// in the left column. A caramel coupon ticket: side notches (mask) + a dashed
// perforation across the axis + a big embossed "%".
function HeroTicketPoster(): React.JSX.Element {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
        >
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-caramel/25 blur-3xl dark:bg-caramel/20" />
            <div className="absolute left-[42%] top-[38%] h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-300/30 blur-2xl" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative h-52 w-72 rotate-[-8deg]">
                    <div
                        className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-caramel via-orange-500 to-orange-600 shadow-caramel-lg"
                        style={ticketNotchMask('1.1rem', '58%')}
                    />
                    <div
                        className="absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-white/35 via-transparent to-transparent"
                        style={ticketNotchMask('1.1rem', '58%')}
                    />
                    <span className="absolute inset-x-0 top-[20%] select-none text-center text-7xl font-black text-white/90 drop-shadow-lg">
                        %
                    </span>
                    <div className="absolute inset-x-7 top-[58%] border-t-2 border-dashed border-white/70" />
                    <div
                        className="absolute -right-9 -top-7 h-14 w-20 rotate-12 rounded-2xl bg-caramelLight/90 shadow-caramel-sm"
                        style={ticketNotchMask('0.6rem', '50%')}
                    />
                </div>
            </div>
        </div>
    )
}

export default function HeroSection() {
    const reduceMotion = useReducedMotion()
    const { isDarkMode } = useContext(ThemeContext)
    const sectionRef = useRef<HTMLElement>(null)

    // desktop = viewport is lg+ (min-width:1024, the complement of Tailwind's
    // max-width `lg`); idle = browser has gone idle after paint; webglOK = a
    // real GL context is available; active = hero is intersecting (frameloop);
    // canvasReady = GL context created (cross-fade the poster out).
    const [desktop, setDesktop] = useState(false)
    const [idle, setIdle] = useState(false)
    const [webglOK, setWebglOK] = useState(false)
    const [active, setActive] = useState(true)
    const [canvasReady, setCanvasReady] = useState(false)

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)')
        const update = (): void => setDesktop(mq.matches)
        update()
        mq.addEventListener('change', update)
        return () => mq.removeEventListener('change', update)
    }, [])

    useEffect(() => {
        setWebglOK(detectWebGL())
    }, [])

    // Defer the 3D chunk until the browser is idle so it never competes with
    // first paint / hydration.
    useEffect(() => {
        if (reduceMotion) return
        if (typeof window.requestIdleCallback === 'function') {
            // timeout: the hero's infinite blob animations can starve true
            // idle periods, so cap the wait — 1.5s is past paint+hydration.
            const id = window.requestIdleCallback(() => setIdle(true), {
                timeout: 1500,
            })
            return () => window.cancelIdleCallback(id)
        }
        const timer = window.setTimeout(() => setIdle(true), 200)
        return () => window.clearTimeout(timer)
    }, [reduceMotion])

    // Frameloop gate: pause the canvas whenever the hero scrolls out of view.
    useEffect(() => {
        const el = sectionRef.current
        if (!el) return
        const observer = new IntersectionObserver(
            entries => setActive(entries.some(entry => entry.isIntersecting)),
            { rootMargin: '0px', threshold: 0 },
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    const showCanvas = !reduceMotion && webglOK && desktop && idle

    return (
        <section
            ref={sectionRef}
            className="relative mt-[5rem] flex min-h-screen flex-col justify-center overflow-hidden px-6 py-16 text-gray-800 dark:text-white sm:px-5"
        >
            {/* Floating elements */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden"
            >
                <motion.div
                    className="bg-caramel/8 absolute left-1/4 top-1/4 h-32 w-32 rounded-full blur-xl"
                    animate={
                        reduceMotion
                            ? undefined
                            : {
                                  x: [0, 30, 0],
                                  y: [0, -20, 0],
                              }
                    }
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
                <motion.div
                    className="bg-orange-300/8 absolute right-1/4 top-3/4 h-24 w-24 rounded-full blur-xl"
                    animate={
                        reduceMotion
                            ? undefined
                            : {
                                  x: [0, -25, 0],
                                  y: [0, 25, 0],
                              }
                    }
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 2,
                    }}
                />
                <motion.div
                    className="bg-caramel/6 absolute right-1/3 top-1/2 h-20 w-20 rounded-full blur-lg"
                    animate={
                        reduceMotion
                            ? undefined
                            : {
                                  x: [0, 20, 0],
                                  y: [0, -15, 0],
                              }
                    }
                    transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 4,
                    }}
                />
            </div>

            <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center gap-12 lg:flex-col lg:gap-10">
                {/* LEFT column: the hero copy, re-aligned left on desktop and
                    re-centered (as before) below lg. */}
                <div className="flex w-[55%] flex-col items-start text-left lg:w-full lg:items-center lg:text-center">
                    <motion.h1
                        initial={
                            reduceMotion
                                ? { opacity: 0 }
                                : { opacity: 0, y: 20 }
                        }
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: revealEase }}
                        className="mb-6 flex flex-col items-start text-5xl font-bold tracking-tight lg:items-center lg:text-4xl md:text-3xl"
                    >
                        <motion.div
                            initial={
                                reduceMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, y: 20 }
                            }
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: revealEase }}
                            className="mb-4 text-gray-700 dark:text-white"
                        >
                            Welcome to
                        </motion.div>
                        <motion.div
                            initial={
                                reduceMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, scale: 0.9 }
                            }
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                                duration: 0.8,
                                delay: 0.3,
                                type: 'spring',
                                stiffness: 100,
                                damping: 15,
                            }}
                            className="relative"
                            whileHover={
                                reduceMotion ? undefined : { scale: 1.02 }
                            }
                        >
                            {/* unoptimized on purpose: the wordmark is a 40KB
                                PNG, but width=2000 makes the optimizer build a
                                w=3840 variant ON the LCP critical path — a
                                cold-cache sharp conversion that starves 2-core
                                CI runners (nav e2e flakes) for zero visual
                                gain. Static serve is instant and cacheable. */}
                            <Image
                                src="/full-logo.png"
                                alt="Caramel Logo"
                                height={2000}
                                width={2000}
                                className="max-w-md drop-shadow-lg lg:mx-auto lg:w-full"
                                priority
                                unoptimized
                            />
                        </motion.div>
                    </motion.h1>

                    <motion.p
                        initial={
                            reduceMotion
                                ? { opacity: 0 }
                                : { opacity: 0, y: 10 }
                        }
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.6,
                            delay: 0.4,
                            ease: revealEase,
                        }}
                        className="mb-10 max-w-xl text-xl leading-relaxed text-gray-600 dark:text-gray-300 lg:mx-auto lg:max-w-2xl lg:text-lg md:text-base"
                    >
                        The{' '}
                        <motion.a
                            href="https://github.com/DevinoSolutions/caramel"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cursor-pointer rounded px-1 font-semibold text-caramel transition-all duration-300 hover:bg-orange-500/10"
                            whileHover={{
                                backgroundColor: 'rgba(234, 105, 37, 0.1)',
                                scale: 1.02,
                            }}
                        >
                            open-source
                        </motion.a>{' '}
                        and{' '}
                        <motion.a
                            href="#why-not"
                            className="cursor-pointer rounded px-1 font-semibold text-caramel transition-all duration-300 hover:bg-orange-500/10"
                            whileHover={{
                                backgroundColor: 'rgba(234, 105, 37, 0.1)',
                                scale: 1.02,
                            }}
                        >
                            privacy-first
                        </motion.a>{' '}
                        alternative to Honey. Automatically finds and applies
                        the best coupon codes at checkout —
                        <motion.a
                            href="#why-not"
                            className="cursor-pointer rounded px-1 font-semibold text-caramel transition-all duration-300 hover:bg-orange-500/10"
                            whileHover={{
                                backgroundColor: 'rgba(234, 105, 37, 0.1)',
                                scale: 1.02,
                            }}
                        >
                            {' '}
                            without selling your data
                        </motion.a>{' '}
                        or{' '}
                        <motion.a
                            href="#why-not"
                            className="cursor-pointer rounded px-1 font-semibold text-caramel transition-all duration-300 hover:bg-orange-500/10"
                            whileHover={{
                                backgroundColor: 'rgba(234, 105, 37, 0.1)',
                                scale: 1.02,
                            }}
                        >
                            hijacking creatorsʼ commissions
                        </motion.a>
                        .
                    </motion.p>

                    {/* Stats Section */}
                    <motion.div
                        initial={
                            reduceMotion
                                ? { opacity: 0 }
                                : { opacity: 0, y: 20 }
                        }
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.6,
                            delay: 0.6,
                            ease: revealEase,
                        }}
                        className="mb-10 flex items-center justify-start gap-8 lg:justify-center lg:gap-6 md:gap-4 sm:flex-col sm:items-start sm:gap-6"
                    >
                        {[
                            { value: '5,000+', label: 'Supported Stores' },
                            { value: '100%', label: 'Open Source' },
                            { value: '0%', label: 'Data Selling' },
                        ].map((stat, index) => (
                            <React.Fragment key={stat.label}>
                                <motion.div
                                    className="text-center"
                                    initial={
                                        reduceMotion
                                            ? { opacity: 0 }
                                            : { opacity: 0, y: 10 }
                                    }
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: 0.4,
                                        delay: 0.6 + index * 0.1,
                                        ease: revealEase,
                                    }}
                                    whileHover={
                                        reduceMotion
                                            ? undefined
                                            : { scale: 1.05 }
                                    }
                                >
                                    <div className="text-3xl font-bold tracking-tight text-caramel lg:text-2xl md:text-xl">
                                        {stat.value}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        {stat.label}
                                    </div>
                                </motion.div>
                                {index < 2 && (
                                    <div
                                        aria-hidden="true"
                                        className="h-12 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent dark:via-gray-600 sm:hidden"
                                    ></div>
                                )}
                            </React.Fragment>
                        ))}
                    </motion.div>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={
                            reduceMotion
                                ? { opacity: 0 }
                                : { opacity: 0, y: 20 }
                        }
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.6,
                            delay: 0.8,
                            ease: revealEase,
                        }}
                        className="flex flex-wrap justify-start gap-4 lg:justify-center md:flex-col md:items-center md:gap-3"
                    >
                        <motion.a
                            href="#install-extension"
                            className="rounded-full bg-gradient-to-r from-caramel to-orange-600 px-8 py-4 font-semibold text-black shadow-lg transition-all duration-300 hover:from-orange-600 hover:to-caramel hover:shadow-xl"
                            initial={{
                                boxShadow: '0 0 10px rgba(234,105,37,0.5)',
                            }}
                            animate={
                                reduceMotion
                                    ? {
                                          boxShadow:
                                              '0 0 18px rgba(234,105,37,0.6)',
                                      }
                                    : {
                                          scale: [1, 1.04, 1],
                                          boxShadow: [
                                              '0 0 10px rgba(234,105,37,0.5)',
                                              '0 0 24px rgba(234,105,37,0.85)',
                                              '0 0 10px rgba(234,105,37,0.5)',
                                          ],
                                      }
                            }
                            transition={{
                                duration: 2.2,
                                repeat: reduceMotion ? 0 : Infinity,
                                ease: 'easeInOut',
                            }}
                            whileHover={{
                                scale: 1.05,
                                boxShadow: '0 20px 40px rgba(234,105,37,0.35)',
                            }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Install Extension
                        </motion.a>
                        <motion.a
                            href="https://github.com/DevinoSolutions/caramel"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-3 rounded-full border-2 border-caramel/40 bg-transparent px-6 py-3 text-sm font-semibold text-caramel backdrop-blur-sm transition-all duration-300 hover:border-caramel hover:bg-caramel hover:text-white"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <FaGithub className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
                            View Source Code
                        </motion.a>
                        <motion.a
                            href="#features"
                            className="rounded-full border-2 border-gray-300/60 bg-transparent px-8 py-4 font-semibold text-gray-700 backdrop-blur-sm transition-all duration-300 hover:border-caramel hover:text-caramel dark:border-gray-600/60 dark:text-gray-300"
                            whileHover={{
                                scale: 1.05,
                                borderColor: 'rgb(234, 105, 37)',
                            }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Why Choose Caramel?
                        </motion.a>
                    </motion.div>
                </div>

                {/* RIGHT column: the interactive 3D coupon. Desktop-only
                    (lg:hidden collapses it below lg so phones never mount WebGL
                    and the layout returns to the original single column). The
                    box is reserved up front; the live canvas cross-fades in
                    over the poster, so there is zero CLS. */}
                <div className="relative h-[32rem] w-[45%] lg:hidden">
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 transition-opacity duration-700 ease-out"
                        style={{ opacity: canvasReady ? 0 : 1 }}
                    >
                        <HeroTicketPoster />
                    </div>
                    {showCanvas && (
                        <div
                            aria-hidden="true"
                            className="absolute inset-0 transition-opacity duration-700 ease-out"
                            style={{ opacity: canvasReady ? 1 : 0 }}
                        >
                            <HeroTicketScene
                                active={active}
                                isDark={isDarkMode}
                                onReady={() => setCanvasReady(true)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
