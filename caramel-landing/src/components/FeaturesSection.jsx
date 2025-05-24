"use client";

import React from "react";
import { motion } from "framer-motion";
import { FaDollarSign, FaLock, FaStar, FaHeart, FaBolt, FaGlobe, FaChrome, FaFirefox, FaEdge } from "react-icons/fa";
import { HiCheckCircle, HiXCircle } from "react-icons/hi";

const features = [
    {
        title: "Automated Coupon Application",
        desc: "Saves you money by finding and applying the best coupon codes.",
        detail: "We monitor thousands of coupon codes across 5,000+ stores, ensuring you always get the best deal without lifting a finger.",
        icon: <FaDollarSign />,
    },
    {
        title: "Privacy-First & Transparent",
        desc: "Your data stays yours. We don't track, sell, or monetize your information.",
        detail: "Unlike other extensions, we never collect personal data, track your browsing, or hijack affiliate commissions from content creators.",
        icon: <FaLock />,
    },
    {
        title: "100% Open Source",
        desc: "Our entire codebase is public and community-driven.",
        detail: "Join our GitHub to contribute features, report issues, or request enhancements. Audited by security professionals for your peace of mind.",
        icon: <FaStar />,
    },
    {
        title: "Creator-Friendly",
        desc: "We never overwrite affiliate links or steal commissions.",
        detail: "Support your favorite content creators while saving money. We ensure affiliate links stay with their rightful owners.",
        icon: <FaHeart />,
    },
    {
        title: "Lightning Fast",
        desc: "Instant coupon discovery and application at checkout.",
        detail: "Our optimized algorithms search and apply coupons in seconds, never slowing down your shopping experience.",
        icon: <FaBolt />,
    },
    {
        title: "Cross-Browser Support",
        desc: "Works seamlessly across Chrome, Firefox, and more.",
        detail: "One extension, all browsers. Consistent experience regardless of your browser preference with automatic updates.",
        icon: <FaGlobe />,
    }
];

const comparisonItems = [
    {
        title: "Privacy Protection",
        other: "Sells your personal data",
        caramel: "100% privacy-first approach"
    },
    {
        title: "Data Collection",
        other: "Tracks your browsing habits",
        caramel: "Zero tracking or data collection"
    },
    {
        title: "Creator Support",
        other: "Hijacks affiliate commissions",
        caramel: "Protects creator earnings"
    },
    {
        title: "Code Transparency",
        other: "Closed source & hidden",
        caramel: "Fully open source & audited"
    },
    {
        title: "Performance",
        other: "Slow and resource-heavy",
        caramel: "Lightning fast & lightweight"
    }
];

export default function FeaturesSection() {
    return (
        <section id="features" className="py-32 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-caramel/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-caramel/20 to-transparent"></div>
            </div>

            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="text-center mb-20"
                >
                    <h2 className="text-5xl lg:text-4xl font-extrabold mb-8 text-caramel">
                        Why Choose Caramel?
                    </h2>
                    <p className="text-xl lg:text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        The ethical alternative that puts your privacy first while maximizing your savings
                    </p>
                </motion.div>

                {/* Features Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                    className="mb-24"
                >
                    <div className="grid grid-cols-3 lg:grid-cols-2 sm:grid-cols-1 gap-8">
                        {features.map((feat, index) => (
                            <motion.div
                                key={feat.title}
                                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{
                                    duration: 0.6,
                                    delay: index * 0.1,
                                    type: "spring",
                                    stiffness: 100,
                                    damping: 15
                                }}
                                whileHover={{
                                    scale: 1.02,
                                    y: -5,
                                    boxShadow: "0 20px 40px rgba(234,105,37,0.15)",
                                    transition: { duration: 0.2 }
                                }}
                                className="relative bg-gradient-to-br from-caramel/5 via-orange-50/30 to-caramel/5 dark:from-caramel/10 dark:via-orange-900/20 dark:to-caramel/10 rounded-2xl p-8 sm:p-6 border border-caramel/20 dark:border-caramel/30 shadow-md overflow-hidden group"
                            >
                                {/* Animated Background Pattern */}
                                <div className="absolute inset-0 opacity-5">
                                    <motion.div
                                        className="w-full h-full"
                                        style={{
                                            backgroundImage: `
                                                linear-gradient(90deg, #ea6925 1px, transparent 1px),
                                                linear-gradient(#ea6925 1px, transparent 1px)
                                            `,
                                            backgroundSize: "20px 20px"
                                        }}
                                        animate={{
                                            backgroundPosition: ["0px 0px", "20px 20px", "0px 0px"]
                                        }}
                                        transition={{
                                            duration: 8,
                                            repeat: Infinity,
                                            ease: "linear",
                                            repeatType: "loop"
                                        }}
                                    />
                                </div>

                                <div className="relative z-10 text-center">
                                    <motion.div
                                        className="text-6xl mx-auto mb-6 text-caramel transition-transform duration-300"
                                        animate={{
                                            rotate: [0, 2, -2, 0],
                                            scale: [1, 1.02, 1]
                                        }}
                                        transition={{
                                            duration: 4,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                            repeatType: "loop"
                                        }}
                                        whileHover={{ scale: 1.1 }}
                                    >
                                        {feat.icon}
                                    </motion.div>
                                    <h3 className="text-3xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-4 tracking-tight">
                                        {feat.title}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed text-lg sm:text-base">
                                        {feat.desc}
                                    </p>
                                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm sm:text-xs">
                                        {feat.detail}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Comparison Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="mb-24"
                >
                    <div className="text-center mb-12">
                        <h3 className="text-3xl lg:text-2xl font-extrabold text-gray-900 dark:text-white mb-4">
                            Caramel vs Others
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            See how we stack up against traditional coupon extensions
                        </p>
                    </div>

                    <div className="max-w-4xl mx-auto space-y-4">
                        {comparisonItems.map((item, index) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
                                className="bg-white dark:bg-darkerBg rounded-xl shadow-sm border border-gray-100 dark:border-caramel/30 overflow-hidden"
                            >
                                <div className="grid grid-cols-2 lg:grid-cols-2 sm:grid-cols-1">
                                    {/* Others */}
                                    <div className="p-6 flex items-center space-x-4">
                                        <div className="flex-shrink-0">
                                            <HiXCircle className="w-8 h-8 text-red-500" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wide mb-1">
                                                Other Extensions
                                            </h4>
                                            <p className="text-gray-900 dark:text-white font-medium">
                                                {item.other}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Caramel */}
                                    <div className="p-6 bg-gradient-to-br from-caramel/5 via-orange-50/30 to-caramel/5 dark:from-caramel/10 dark:via-orange-900/20 dark:to-caramel/10 flex items-center space-x-4 border-l border-caramel/20 sm:border-l-0 sm:border-t">
                                        <div className="flex-shrink-0">
                                            <HiCheckCircle className="w-8 h-8 text-caramel" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium text-caramel text-sm uppercase tracking-wide mb-1">
                                                Caramel
                                            </h4>
                                            <p className="text-gray-900 dark:text-white font-medium">
                                                {item.caramel}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Browser Support Section */}
                <motion.div
                    id="install-extension"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                    className="text-center bg-gradient-to-r from-caramel to-orange-600 rounded-3xl p-12 lg:p-8 text-white shadow-lg"
                >
                    <h3 className="text-3xl lg:text-2xl font-extrabold mb-6 tracking-tight">
                        Available on Safari, More Coming Soon!
                    </h3>
                    <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto leading-relaxed">
                        Start saving with Caramel on Safari today, with Chrome, Firefox, and Edge support coming soon!
                    </p>
                    <div className="flex justify-center gap-6 lg:gap-4 sm:flex-col sm:items-center sm:gap-4">
                        {[
                            {
                                name: "Safari",
                                icon: <FaGlobe />,
                                href: "https://apps.apple.com/ke/app/caramel/id6741873881",
                                available: true
                            },
                            {
                                name: "Chrome",
                                icon: <FaChrome />,
                                href: "#",
                                available: false
                            },
                            {
                                name: "Firefox",
                                icon: <FaFirefox />,
                                href: "#",
                                available: false
                            },
                            {
                                name: "Edge",
                                icon: <FaEdge />,
                                href: "#",
                                available: false
                            }
                        ].map((browser, index) => (
                            <motion.div
                                key={browser.name}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{
                                    duration: 0.4,
                                    delay: index * 0.1,
                                    type: "spring",
                                    stiffness: 120
                                }}
                                className="relative"
                            >
                                {browser.available ? (
                                    <motion.a
                                        href={browser.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        whileHover={{
                                            scale: 1.05,
                                            transition: { duration: 0.2 }
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        className="inline-flex items-center px-8 py-4 bg-white text-caramel hover:bg-orange-50 font-semibold rounded-full transition-all duration-200 shadow-md hover:shadow-xl md:min-w-[200px]"
                                    >
                                        <span className="mr-3 text-2xl">{browser.icon}</span>
                                        {browser.name}
                                    </motion.a>
                                ) : (
                                    <div className="inline-flex items-center px-8 py-4 bg-white/20 text-white/70 font-semibold rounded-full shadow-md relative md:min-w-[200px]">
                                        <span className="mr-3 text-2xl opacity-60">{browser.icon}</span>
                                        <span className="opacity-60">{browser.name}</span>
                                        <div className="absolute -top-2 -right-2 bg-orange-400 text-white text-xs px-2 py-1 rounded-full font-bold">
                                            Soon
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}