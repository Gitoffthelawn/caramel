import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import OpenSourceSection from "@/components/OpenSourceSection";
import React from "react";
import Doodles from "@/components/Doodles";
import SupportedSection from "@/components/SupportedSection";
import AppHeader from "@/components/AppHeader";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Index() {
    return (
        <main className="w-full relative overflow-x-clip -mt-[6.7rem]">
            <AppHeader />
            <Doodles />

            {/* Add smooth scrolling behavior */}
            <div className="scroll-smooth">
                <HeroSection />

                {/* Enhanced transition sections with particle effects */}
                <motion.div
                    className="relative h-px"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 2 }}
                >
                    <div className="h-px bg-gradient-to-r from-transparent via-caramel/40 to-transparent"></div>
                    <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent blur-sm"></div>

                    {/* Floating particles on dividers */}
                    {[...Array(5)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-caramel/60 rounded-full"
                            style={{
                                left: `${20 + i * 15}%`,
                                top: "50%",
                                transform: "translateY(-50%)"
                            }}
                            animate={{
                                y: [-5, 5, -5],
                                opacity: [0.6, 1, 0.6],
                                scale: [1, 1.5, 1]
                            }}
                            transition={{
                                duration: 2 + i * 0.3,
                                repeat: Infinity,
                                delay: i * 0.2
                            }}
                        />
                    ))}
                </motion.div>

                <FeaturesSection />

                <motion.div
                    className="relative h-px"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 2, delay: 0.2 }}
                >
                    <div className="h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent"></div>
                    <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-pink-500/20 to-transparent blur-sm"></div>
                </motion.div>

                <SupportedSection />

                <motion.div
                    className="relative h-px"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 2, delay: 0.4 }}
                >
                    <div className="h-px bg-gradient-to-r from-transparent via-caramelLight/40 to-transparent"></div>
                    <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-caramel/20 to-transparent blur-sm"></div>
                </motion.div>

                <OpenSourceSection />

                {/* Ultimate Footer with Holographic Effects */}
                <motion.footer
                    className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 dark:from-black dark:via-gray-900 dark:to-black text-white py-24 overflow-hidden"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5 }}
                >
                    {/* Animated Background */}
                    <div className="absolute inset-0">
                        <motion.div
                            className="absolute inset-0 opacity-10"
                            animate={{
                                background: [
                                    "radial-gradient(circle at 20% 20%, rgba(234,105,37,0.3) 0%, transparent 50%)",
                                    "radial-gradient(circle at 80% 80%, rgba(168,85,247,0.3) 0%, transparent 50%)",
                                    "radial-gradient(circle at 50% 50%, rgba(236,72,153,0.3) 0%, transparent 50%)",
                                    "radial-gradient(circle at 20% 80%, rgba(234,105,37,0.3) 0%, transparent 50%)",
                                    "radial-gradient(circle at 20% 20%, rgba(234,105,37,0.3) 0%, transparent 50%)"
                                ]
                            }}
                            transition={{
                                duration: 15,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                        />

                        {/* Particle system */}
                        {[...Array(30)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-1 h-1 bg-caramel/30 rounded-full"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                }}
                                animate={{
                                    y: [0, -50, 0],
                                    opacity: [0, 0.8, 0],
                                    scale: [0, 1, 0],
                                }}
                                transition={{
                                    duration: 4 + Math.random() * 2,
                                    repeat: Infinity,
                                    delay: Math.random() * 4,
                                }}
                            />
                        ))}
                    </div>

                    <div className="max-w-7xl mx-auto px-6 relative z-10">
                        <motion.div
                            className="grid grid-cols-4 lg:grid-cols-2 md:grid-cols-1 gap-12 mb-16"
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, staggerChildren: 0.1 }}
                        >
                            {/* Brand Section */}
                            <motion.div
                                initial={{ opacity: 0, x: -50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                                className="group"
                            >
                                <motion.h3
                                    className="text-2xl font-bold text-caramel mb-4 group-hover:scale-105 transition-transform duration-300"
                                    animate={{
                                        textShadow: [
                                            "0 0 0px #ea6925",
                                            "0 0 20px #ea6925",
                                            "0 0 0px #ea6925"
                                        ]
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity
                                    }}
                                >
                                    Caramel
                                </motion.h3>
                                <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                                    The privacy-first alternative to Honey. Save money without compromising your data or creators' commissions.
                                    <br /><br />
                                    <span className="text-caramel font-semibold">100% Open Source • 5,000+ Stores • 0% Data Selling</span>
                                </p>
                            </motion.div>

                            {/* Product Links */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, delay: 0.1 }}
                            >
                                <h4 className="font-semibold mb-6 text-lg">Product</h4>
                                <ul className="space-y-3 text-sm">
                                    {[
                                        { href: "#features", label: "Features" },
                                        { href: "#supported", label: "Supported Stores" },
                                        { href: "#how-it-works", label: "How it Works" },
                                        { href: "#privacy", label: "Privacy Policy" }
                                    ].map((link, i) => (
                                        <motion.li
                                            key={link.label}
                                            whileHover={{ x: 10, scale: 1.05 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Link
                                                href={link.href}
                                                className="text-gray-400 hover:text-caramel transition-colors duration-300 flex items-center gap-2 group"
                                            >
                                                <span className="w-1 h-1 bg-caramel rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                                                {link.label}
                                            </Link>
                                        </motion.li>
                                    ))}
                                </ul>
                            </motion.div>

                            {/* Community Links */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                            >
                                <h4 className="font-semibold mb-6 text-lg">Community</h4>
                                <ul className="space-y-3 text-sm">
                                    {[
                                        { href: "https://github.com/DevinoSolutions/caramel", label: "GitHub", external: true },
                                        { href: "https://discord.gg/buzn7N5c", label: "Discord", external: true },
                                        { href: "#contributing", label: "Contributing" },
                                        { href: "#bug-reports", label: "Bug Reports" }
                                    ].map((link, i) => (
                                        <motion.li
                                            key={link.label}
                                            whileHover={{ x: 10, scale: 1.05 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Link
                                                href={link.href}
                                                {...(link.external && { target: "_blank", rel: "noopener noreferrer" })}
                                                className="text-gray-400 hover:text-purple-400 transition-colors duration-300 flex items-center gap-2 group"
                                            >
                                                <span className="w-1 h-1 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                                                {link.label}
                                                {link.external && <span className="text-xs">↗</span>}
                                            </Link>
                                        </motion.li>
                                    ))}
                                </ul>
                            </motion.div>

                            {/* Connect Links */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, delay: 0.3 }}
                            >
                                <h4 className="font-semibold mb-6 text-lg">Connect</h4>
                                <ul className="space-y-3 text-sm">
                                    {[
                                        { href: "https://www.instagram.com/grab.caramel/", label: "Instagram", external: true },
                                        { href: "#twitter", label: "Twitter" },
                                        { href: "#contact", label: "Contact" },
                                        { href: "#support", label: "Support" }
                                    ].map((link, i) => (
                                        <motion.li
                                            key={link.label}
                                            whileHover={{ x: 10, scale: 1.05 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Link
                                                href={link.href}
                                                {...(link.external && { target: "_blank", rel: "noopener noreferrer" })}
                                                className="text-gray-400 hover:text-pink-400 transition-colors duration-300 flex items-center gap-2 group"
                                            >
                                                <span className="w-1 h-1 bg-pink-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                                                {link.label}
                                                {link.external && <span className="text-xs">↗</span>}
                                            </Link>
                                        </motion.li>
                                    ))}
                                </ul>
                            </motion.div>
                        </motion.div>

                        {/* Footer Bottom with Enhanced Styling */}
                        <motion.div
                            className="border-t border-gray-800 pt-12"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.5 }}
                        >
                            <div className="flex justify-between items-center md:flex-col md:gap-6">
                                <motion.div
                                    className="text-sm text-gray-400"
                                    animate={{
                                        color: ["#9ca3af", "#ea6925", "#9ca3af"]
                                    }}
                                    transition={{
                                        duration: 4,
                                        repeat: Infinity
                                    }}
                                >
                                    © 2025 Caramel. Open source and built with{" "}
                                    <motion.span
                                        animate={{
                                            scale: [1, 1.2, 1]
                                        }}
                                        transition={{
                                            duration: 1.5,
                                            repeat: Infinity
                                        }}
                                        className="text-red-400"
                                    >
                                        ❤️
                                    </motion.span>{" "}
                                    by the community.
                                </motion.div>

                                <div className="flex items-center gap-8 text-sm text-gray-400">
                                    {[
                                        { href: "#terms", label: "Terms" },
                                        { href: "#privacy", label: "Privacy" },
                                        { href: "https://github.com/DevinoSolutions/caramel", label: "Open Source", external: true }
                                    ].map((link, i) => (
                                        <motion.div
                                            key={link.label}
                                            whileHover={{ scale: 1.1, y: -2 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Link
                                                href={link.href}
                                                {...(link.external && { target: "_blank", rel: "noopener noreferrer" })}
                                                className="hover:text-caramel transition-colors duration-300"
                                            >
                                                {link.label}
                                            </Link>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.footer>
            </div>
        </main>
    );
}