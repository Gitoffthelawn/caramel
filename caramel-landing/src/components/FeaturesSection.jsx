"use client";

import React from "react";
import { motion } from "framer-motion";
import { FaDollarSign, FaLock, FaStar, FaHeart, FaBolt, FaGlobe, FaChrome, FaFirefox, FaEdge, FaTimes, FaCheck } from "react-icons/fa";
import { MdSentimentDissatisfied, MdSentimentSatisfiedAlt } from "react-icons/md";

const features = [
    {
        title: "Automated Coupon Application",
        desc: "Saves you money by finding and applying the best coupon codes.",
        detail: "We monitor thousands of coupon codes across 5,000+ stores, ensuring you always get the best deal without lifting a finger.",
        icon: <FaDollarSign />,
        color: "from-caramel to-caramelLight"
    },
    {
        title: "Privacy-First & Transparent",
        desc: "Your data stays yours. We don't track, sell, or monetize your information.",
        detail: "Unlike other extensions, we never collect personal data, track your browsing, or hijack affiliate commissions from content creators.",
        icon: <FaLock />,
        color: "from-caramel to-caramelLight"
    },
    {
        title: "100% Open Source",
        desc: "Our entire codebase is public and community-driven.",
        detail: "Join our GitHub to contribute features, report issues, or request enhancements. Audited by security professionals for your peace of mind.",
        icon: <FaStar />,
        color: "from-caramel to-caramelLight"
    },
    {
        title: "Creator-Friendly",
        desc: "We never overwrite affiliate links or steal commissions.",
        detail: "Support your favorite content creators while saving money. We ensure affiliate links stay with their rightful owners.",
        icon: <FaHeart />,
        color: "from-caramel to-caramelLight"
    },
    {
        title: "Lightning Fast",
        desc: "Instant coupon discovery and application at checkout.",
        detail: "Our optimized algorithms search and apply coupons in seconds, never slowing down your shopping experience.",
        icon: <FaBolt />,
        color: "from-caramel to-caramelLight"
    },
    {
        title: "Cross-Browser Support",
        desc: "Works seamlessly across Chrome, Firefox, and more.",
        detail: "One extension, all browsers. Consistent experience regardless of your browser preference with automatic updates.",
        icon: <FaGlobe />,
        color: "from-caramel to-caramelLight"
    }
];

const comparisonItems = [
    {
        title: "Privacy",
        other: "Sells your personal data",
        caramel: "100% privacy-first approach"
    },
    {
        title: "Tracking",
        other: "Tracks your browsing habits",
        caramel: "No tracking or data collection"
    },
    {
        title: "Affiliates",
        other: "Hijacks affiliate commissions",
        caramel: "Protects creator commissions"
    },
    {
        title: "Codebase",
        other: "Closed source code",
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
        <section id="features" className="py-32 dark:bg-darkBg relative overflow-hidden">
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
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center mb-20"
                >
                    <h2 className="text-5xl lg:text-4xl font-extrabold mb-8 bg-gradient-to-r from-caramel to-caramelLight bg-clip-text text-transparent tracking-tight">
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
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    className="mb-24"
                >
                    <div className="grid grid-cols-3 lg:grid-cols-2 sm:grid-cols-1 gap-8">
                        {features.map((feat, index) => (
                            <motion.div
                                key={feat.title}
                                initial={{ opacity: 0, x: index % 2 === 0 ? -100 : 100 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, delay: index * 0.2, type: "spring", bounce: 0.4 }}
                                whileHover={{ scale: 1.02, rotateY: 5, boxShadow: "0 20px 40px rgba(234,105,37,0.15)" }}
                                className="relative bg-gradient-to-br from-white via-gray-50 to-white dark:from-darkerBg dark:via-gray-900 dark:to-darkerBg rounded-2xl p-8 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden"
                            >
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
                                        animate={{ backgroundPosition: ["0px 0px", "20px 20px", "0px 0px"] }}
                                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                    />
                                </div>
                                <div className="relative z-10 text-center">
                                    <motion.div
                                        className="text-6xl mx-auto mb-6 text-caramel group-hover:scale-105 transition-transform duration-300"
                                        animate={{ rotate: [0, 5, -5, 0] }}
                                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
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
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-24"
                >
                    <h3 className="text-3xl lg:text-2xl font-extrabold text-center mb-12 text-gray-800 dark:text-white tracking-tight">
                        Caramel Outshines the Rest
                    </h3>
                    <div className="flex flex-col gap-4 sm:gap-2 -mt-4">
                        {comparisonItems.map((item, index) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.2, ease: "easeOut" }}
                                className="relative bg-white dark:bg-darkerBg rounded-xl border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden z-[10]"
                            >
                                <div className="grid grid-cols-2 lg:grid-cols-2 sm:grid-cols-1 gap-4 sm:gap-2 px-6 py-4 sm:p-3">
                                    {/* Other Extensions */}
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.6, delay: index * 0.2 + 0.1 }}
                                        className="flex items-center justify-center space-x-3 sm:space-x-2"
                                    >
                                        <div className="text-4xl text-gray-500 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
                                            <MdSentimentDissatisfied />
                                        </div>
                                        <div className="text-left">
                                            <h4 className="text-2xl sm:text-xl font-bold text-gray-800 dark:text-white tracking-tight">
                                                {item.title}
                                            </h4>
                                            <p className="text-base sm:text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                                                <FaTimes className="text-sm text-gray-500 mr-2" /> {item.other}
                                            </p>
                                        </div>
                                    </motion.div>
                                    {/* Caramel */}
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.6, delay: index * 0.2 + 0.1 }}
                                        className="flex items-center justify-center space-x-3 sm:space-x-2 bg-gradient-to-r from-caramel/20 to-caramelLight/20 rounded-r-xl sm:rounded-xl"
                                    >
                                        <div className="text-4xl text-caramel filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
                                            <MdSentimentSatisfiedAlt />
                                        </div>
                                        <div className="text-left">
                                            <h4 className="text-2xl sm:text-xl font-bold text-caramel tracking-tight">
                                                {item.title}
                                            </h4>
                                            <p className="text-base sm:text-sm font-medium text-white flex items-center">
                                                <FaCheck className="text-sm text-caramel mr-2" /> {item.caramel}
                                            </p>
                                        </div>
                                    </motion.div>
                                </div>
                                {/* Gradient Bar */}
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-gray-200/50 to-caramel/50"></div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Where to Get Caramel? Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                    className="text-center bg-gradient-to-r from-caramel to-caramelLight rounded-2xl p-12 lg:p-8 text-white shadow-lg"
                >
                    <h3 className="text-3xl lg:text-2xl font-extrabold mb-6 tracking-tight">
                        Where to Get Caramel?
                    </h3>
                    <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto leading-relaxed">
                        Install Caramel on your favorite browser and start saving today!
                    </p>
                    <div className="flex justify-center gap-6 lg:gap-4 sm:flex-col sm:items-center sm:gap-4">
                        {[
                            { name: "Chrome", icon: <FaChrome />, href: "https://chrome.google.com/webstore" },
                            { name: "Firefox", icon: <FaFirefox />, href: "https://addons.mozilla.org" },
                            { name: "Edge", icon: <FaEdge />, href: "https://microsoftedge.microsoft.com/addons" }
                        ].map((browser, index) => (
                            <motion.a
                                key={browser.name}
                                href={browser.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{ opacity: 0, x: index % 2 === 0 ? -100 : 100 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, delay: index * 0.2, type: "spring", bounce: 0.4 }}
                                className="flex items-center px-8 py-4 bg-white text-caramel hover:bg-gray-100 font-semibold rounded-full transition-all duration-300 transform hover:scale-105 shadow-md"
                            >
                                <span className="mr-2 text-2xl">{browser.icon}</span>
                                {browser.name}
                            </motion.a>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}