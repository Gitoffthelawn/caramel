"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { FaGithub } from "react-icons/fa";

export default function HeroSection() {
    return (
        <section className="relative mt-[5rem] min-h-screen dark:text-white flex flex-col justify-center overflow-hidden px-6 py-16 text-gray-800">
            {/* Floating elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute top-1/4 left-1/4 w-32 h-32 bg-caramel/8 rounded-full blur-xl"
                    animate={{
                        x: [0, 30, 0],
                        y: [0, -20, 0],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute top-3/4 right-1/4 w-24 h-24 bg-orange-300/8 rounded-full blur-xl"
                    animate={{
                        x: [0, -25, 0],
                        y: [0, 25, 0],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 2
                    }}
                />
                <motion.div
                    className="absolute top-1/2 right-1/3 w-20 h-20 bg-caramel/6 rounded-full blur-lg"
                    animate={{
                        x: [0, 20, 0],
                        y: [0, -15, 0],
                    }}
                    transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 4
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
                    <motion.a
                        href="https://github.com/DevinoSolutions/caramel"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 px-6 py-3 bg-transparent border-2 border-caramel/40 text-caramel hover:bg-caramel hover:text-white hover:border-caramel transition-all duration-300 rounded-full font-semibold text-sm group backdrop-blur-sm"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <FaGithub className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                        View Source Code
                    </motion.a>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-5xl lg:text-4xl md:text-3xl flex flex-col justify-center font-bold mb-6"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="m-auto dark:text-white text-gray-700 mb-4"
                    >
                        Welcome to
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                            duration: 0.8,
                            delay: 0.3,
                            type: "spring",
                            stiffness: 100,
                            damping: 15
                        }}
                        className="relative"
                        whileHover={{ scale: 1.02 }}
                    >
                        <Image
                            src="/full-logo.png"
                            alt="Caramel Logo"
                            height={2000}
                            width={2000}
                            className="m-auto drop-shadow-lg max-w-lg lg:w-full"
                            priority
                        />
                    </motion.div>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-xl lg:text-lg md:text-base text-gray-600 dark:text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed"
                >
                    The <span className="text-caramel font-semibold">privacy-first</span> alternative to Honey.
                    Automatically finds and applies the best coupon codes at checkout—
                    <span className="text-caramel font-semibold"> without selling your data</span> or hijacking creators' commissions.
                </motion.p>

                {/* Stats Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="flex justify-center items-center gap-8 lg:gap-6 md:gap-4 sm:flex-col sm:gap-6 mb-12"
                >
                    {[
                        { value: "5,000+", label: "Supported Stores" },
                        { value: "100%", label: "Open Source" },
                        { value: "0%", label: "Data Selling" }
                    ].map((stat, index) => (
                        <React.Fragment key={stat.label}>
                            <motion.div
                                className="text-center"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.6 + (index * 0.1) }}
                                whileHover={{ scale: 1.05 }}
                            >
                                <div className="text-3xl lg:text-2xl md:text-xl font-bold text-caramel">
                                    {stat.value}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {stat.label}
                                </div>
                            </motion.div>
                            {index < 2 && (
                                <div className="w-px h-12 bg-gray-300 dark:bg-gray-600 sm:hidden"></div>
                            )}
                        </React.Fragment>
                    ))}
                </motion.div>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="flex justify-center gap-4 md:flex-col md:items-center md:gap-3"
                >
                    <motion.a
                        href="#install-extension"
                        className="px-8 py-4 bg-gradient-to-r from-caramel to-orange-600 hover:from-orange-600 hover:to-caramel text-white font-semibold rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
                        whileHover={{
                            scale: 1.05,
                            boxShadow: "0 20px 40px rgba(234,105,37,0.3)"
                        }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Install Extension
                    </motion.a>
                    <motion.a
                        href="#features"
                        className="px-8 py-4 bg-transparent border-2 border-gray-300/60 dark:border-gray-600/60 text-gray-700 dark:text-gray-300 hover:border-caramel hover:text-caramel font-semibold rounded-full transition-all duration-300 backdrop-blur-sm"
                        whileHover={{
                            scale: 1.05,
                            borderColor: "rgb(234, 105, 37)"
                        }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Why Choose Caramel?
                    </motion.a>
                </motion.div>
            </div>
        </section>
    );
}