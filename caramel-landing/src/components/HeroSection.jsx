"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";

export default function HeroSection() {
    return (
        <section className="relative mt-[5rem] min-h-screen dark:text-white flex flex-col justify-center overflow-hidden px-6 py-16 text-gray-800">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-caramel/5 via-transparent to-caramelLight/5 dark:from-caramel/10 dark:to-caramelLight/10"></div>

            {/* Floating elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute top-1/4 left-1/4 w-32 h-32 bg-caramel/10 rounded-full blur-xl"
                    animate={{
                        x: [0, 50, 0],
                        y: [0, -30, 0],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute top-3/4 right-1/4 w-24 h-24 bg-caramelLight/10 rounded-full blur-xl"
                    animate={{
                        x: [0, -40, 0],
                        y: [0, 40, 0],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 2
                    }}
                />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto text-center">
                {/* View Code Button */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8"
                >
                    <a
                        href="https://github.com/DevinoSolutions/caramel"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-transparent border-2 border-caramel text-caramel hover:bg-caramel hover:text-white transition-all duration-300 rounded-full font-semibold text-sm group"
                    >
                        <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                        </svg>
                        View Source Code
                    </a>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-5xl md:text-3xl flex flex-col justify-center font-bold mb-6"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="m-auto dark:text-white text-black/70 drop-shadow-2xl mb-4"
                    >
                        Welcome to
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="relative"
                    >
                        <Image
                            src="/full-logo.png"
                            alt="logo"
                            height={2000}
                            width={2000}
                            className="m-auto drop-shadow-lg"
                        />
                    </motion.div>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-xl md:text-sm text-gray-600 dark:text-white max-w-3xl mx-auto mb-12 leading-relaxed"
                >
                    The <span className="text-caramel font-semibold">privacy-first</span> alternative to Honey.
                    Automatically finds and applies the best coupon codes at checkout—
                    <span className="text-caramel font-semibold"> without selling your data</span> or hijacking creators' commissions.
                </motion.p>

                {/* Stats Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="flex justify-center items-center gap-8 md:gap-4 mb-8"
                >
                    <div className="text-center">
                        <div className="text-3xl md:text-2xl font-bold text-caramel">5,000+</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Supported Stores</div>
                    </div>
                    <div className="w-px h-12 bg-gray-300 dark:bg-gray-600"></div>
                    <div className="text-center">
                        <div className="text-3xl md:text-2xl font-bold text-caramel">100%</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Open Source</div>
                    </div>
                    <div className="w-px h-12 bg-gray-300 dark:bg-gray-600"></div>
                    <div className="text-center">
                        <div className="text-3xl md:text-2xl font-bold text-caramel">0%</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Data Selling</div>
                    </div>
                </motion.div>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    className="flex justify-center gap-4 md:flex-col md:items-center"
                >
                    <button className="px-8 py-4 bg-caramel hover:bg-caramelLight text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                        Install Extension
                    </button>
                    <button className="px-8 py-4 bg-transparent border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-caramel hover:text-caramel font-semibold rounded-full transition-all duration-300">
                        Learn More
                    </button>
                </motion.div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1.2 }}
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
            >
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-6 h-10 border-2 border-caramel rounded-full flex justify-center"
                >
                    <motion.div
                        animate={{ y: [0, 12, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-1 h-3 bg-caramel rounded-full mt-2"
                    />
                </motion.div>
            </motion.div>
        </section>
    );
}