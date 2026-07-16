'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

const footerLinks = [
    { name: 'Home', url: '/' },
    { name: 'Coupons', url: '/coupons' },
    { name: 'Pricing', url: '/pricing' },
    { name: 'Privacy', url: '/privacy' },
    { name: 'Supported Stores', url: '/supported-stores' },
]

export default function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="bg-caramel text-white">
            <div className="container mx-auto px-6 pt-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    viewport={{ once: true }}
                    className="flex flex-col items-center gap-6 text-center"
                >
                    <Link
                        href="/"
                        className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    >
                        <Image
                            src="/full-logo.png"
                            alt="Caramel"
                            width={140}
                            height={45}
                            className="brightness-0 invert"
                        />
                    </Link>
                    <p className="max-w-md text-sm text-white/90">
                        The open-source, privacy-first way to save at checkout.
                    </p>
                    <nav aria-label="Footer">
                        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium">
                            {footerLinks.map(link => (
                                <li key={link.name}>
                                    <Link
                                        href={link.url}
                                        className="rounded text-white/90 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </motion.div>
            </div>

            {/* Copyright and Powered By */}
            <div className="container mx-auto px-6 py-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    viewport={{ once: true }}
                    className="border-t border-white/20 pt-6 text-center"
                >
                    <div className="flex flex-col items-center gap-3">
                        <p className="text-sm text-white">
                            © {currentYear} Caramel. All Rights Reserved.
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-white">
                                Powered by
                            </span>
                            <Image
                                src="/devino.png"
                                alt="Devino"
                                width={60}
                                height={20}
                                className="inline-block"
                            />
                        </div>
                    </div>
                </motion.div>
            </div>
        </footer>
    )
}
