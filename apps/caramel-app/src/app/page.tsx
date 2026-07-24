'use client'
import CouponVaultSection from '@/components/CouponVaultSection'
import Doodles from '@/components/Doodles'
import FeaturesSection from '@/components/FeaturesSection'
import HeroSection from '@/components/HeroSection'
import OpenSourceSection from '@/components/OpenSourceSection'
import SupportedSection from '@/components/SupportedSection'
import WhyNotHoneySection from '@/components/WhyNot'
import { motion, useReducedMotion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

const dividerEase: [number, number, number, number] = [0.22, 1, 0.36, 1]

export default function Page() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const reduceMotion = useReducedMotion()

    useEffect(() => {
        const error = searchParams.get('error')
        if (error === 'token_expired') {
            router.push('/verify?error=token_expired')
        }
    }, [searchParams, router])

    return (
        <main className="relative -mt-[6.7rem] w-full overflow-x-clip">
            <Doodles />
            <div className="scroll-smooth">
                <HeroSection />
                <motion.div
                    aria-hidden="true"
                    className="relative h-px"
                    initial={reduceMotion ? false : { scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, margin: '0px 0px -40px 0px' }}
                    transition={{ duration: 1.4, ease: dividerEase }}
                >
                    <div className="h-px bg-gradient-to-r from-transparent via-caramel/40 to-transparent"></div>
                    <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent blur-sm"></div>
                    {[...Array(5)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute h-1 w-1 rounded-full bg-caramel/60"
                            style={{
                                left: `${20 + i * 15}%`,
                                top: '50%',
                                transform: 'translateY(-50%)',
                            }}
                            animate={
                                reduceMotion
                                    ? undefined
                                    : {
                                          y: [-5, 5, -5],
                                          opacity: [0.6, 1, 0.6],
                                          scale: [1, 1.5, 1],
                                      }
                            }
                            transition={{
                                duration: 2 + i * 0.3,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: i * 0.2,
                            }}
                        />
                    ))}
                </motion.div>
                <CouponVaultSection />
                <motion.div
                    aria-hidden="true"
                    className="relative h-px"
                    initial={reduceMotion ? false : { scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, margin: '0px 0px -40px 0px' }}
                    transition={{ duration: 1.4, ease: dividerEase }}
                >
                    <div className="h-px bg-gradient-to-r from-transparent via-caramel/40 to-transparent"></div>
                    <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent blur-sm"></div>
                </motion.div>
                <FeaturesSection />
                <motion.div
                    aria-hidden="true"
                    className="relative h-px"
                    initial={reduceMotion ? false : { scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, margin: '0px 0px -40px 0px' }}
                    transition={{ duration: 1.4, ease: dividerEase }}
                >
                    <div className="h-px bg-gradient-to-r from-transparent via-orange-600/40 to-transparent"></div>
                    <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-caramel/20 to-transparent blur-sm"></div>
                </motion.div>
                <SupportedSection />
                <motion.div
                    aria-hidden="true"
                    className="relative h-px"
                    initial={reduceMotion ? false : { scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, margin: '0px 0px -40px 0px' }}
                    transition={{ duration: 1.4, ease: dividerEase }}
                >
                    <div className="h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent"></div>
                    <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-orange-300/20 to-transparent blur-sm"></div>
                </motion.div>
                <WhyNotHoneySection />
                <motion.div
                    aria-hidden="true"
                    className="relative h-px"
                    initial={reduceMotion ? false : { scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, margin: '0px 0px -40px 0px' }}
                    transition={{ duration: 1.4, ease: dividerEase }}
                >
                    <div className="h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent"></div>
                    <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-orange-300/20 to-transparent blur-sm"></div>
                </motion.div>
                <OpenSourceSection />
            </div>
        </main>
    )
}
