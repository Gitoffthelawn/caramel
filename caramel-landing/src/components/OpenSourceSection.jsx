"use client";

import React, { useContext } from "react";
import { motion } from "framer-motion";
import { ThemeContext } from "@/lib/contexts";
import { FaLock, FaEye, FaBan, FaUsers, FaCode, FaStore, FaBug, FaLightbulb, FaGithub, FaDiscord } from "react-icons/fa";
import { RiInstagramFill } from "react-icons/ri";

const platforms = [
    {
        name: "GitHub",
        href: "https://github.com/DevinoSolutions/caramel",
        desc: "Explore our open-source code & contribute",
        icon: <FaGithub />,
        color: "from-gray-600 to-gray-800"
    },
    {
        name: "Discord",
        href: "https://discord.gg/buzn7N5c",
        desc: "Join our developer community",
        icon: <FaDiscord />,
        color: "from-indigo-500 to-purple-600"
    },
    {
        name: "Instagram",
        href: "https://www.instagram.com/grab.caramel/",
        desc: "Follow us for updates & tips",
        icon: <RiInstagramFill />,
        color: "from-pink-500 to-rose-500"
    }
];

const contributions = [
    {
        title: "Code Contributions",
        desc: "Help improve our algorithms, add new features, or fix bugs",
        icon: <FaCode />,
        action: "Start Contributing",
        href: "https://github.com/DevinoSolutions/caramel/issues/new?assignees=&labels=enhancement&projects=&template=feature-request.md&title=%5BFeature%5D+"
    },
    {
        title: "Store Requests",
        desc: "Request support for new e-commerce platforms and stores",
        icon: <FaStore />,
        action: "Request Store",
        href: "https://github.com/DevinoSolutions/caramel/issues/new?assignees=&labels=store-request&projects=&template=store-request.md&title=%5BStore+Request%5D+Add+support+for+"
    },
    {
        title: "Bug Reports",
        desc: "Help us identify and fix issues to improve user experience",
        icon: <FaBug />,
        action: "Report Bug",
        href: "https://github.com/DevinoSolutions/caramel/issues/new?assignees=&labels=bug&projects=&template=bug-report.md&title=%5BBug%5D+"
    },
    {
        title: "Feature Ideas",
        desc: "Suggest new features that would benefit the community",
        icon: <FaLightbulb />,
        action: "Suggest Feature",
        href: "https://github.com/DevinoSolutions/caramel/issues/new?assignees=&labels=enhancement&projects=&template=feature-request.md&title=%5BFeature%5D+"
    }
];

const securityFeatures = [
    {
        title: "Regular Security Audits",
        desc: "Professional security reviews of our codebase",
        icon: <FaLock />
    },
    {
        title: "Transparent Operations",
        desc: "All code changes are public and reviewable",
        icon: <FaEye />
    },
    {
        title: "No Data Collection",
        desc: "We don't store or transmit personal information",
        icon: <FaBan />
    },
    {
        title: "Community Oversight",
        desc: "Thousands of developers can audit our code",
        icon: <FaUsers />
    }
];

export default function OpenSourceSection() {
    const { isDarkMode } = useContext(ThemeContext);

    return (
        <section id="opensource" className="py-32 relative overflow-hidden">
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
                    <h2 className="text-5xl lg:text-4xl font-extrabold mb-8 bg-gradient-to-r from-caramel to-orange-600 bg-clip-text text-transparent tracking-tight">
                        Open Source & Community Driven
                    </h2>
                    <p className="text-xl lg:text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        Transparency is our core. Every line of code is open, auditable, and community-driven. Join thousands of developers building a better alternative to proprietary extensions.
                    </p>
                </motion.div>

                {/* Security First */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                    className="mb-24"
                >
                    <h3 className="text-3xl lg:text-2xl font-extrabold text-center mb-12 text-gray-900 dark:text-white tracking-tight">
                        Security Through Transparency
                    </h3>
                    <div className="grid grid-cols-4 lg:grid-cols-2 sm:grid-cols-1 gap-8">
                        {securityFeatures.map((feature, index) => (
                            <motion.div
                                key={feature.title}
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
                                className="relative bg-gradient-to-br from-caramel/5 via-orange-50/30 to-caramel/5 dark:from-caramel/10 dark:via-orange-900/20 dark:to-caramel/10 rounded-3xl p-8 sm:p-6 border border-caramel/20 dark:border-caramel/30 overflow-hidden group"
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
                                        className="text-6xl mx-auto mb-6 text-caramel transition-transform duration-300 flex justify-center items-center"
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
                                        {feature.icon}
                                    </motion.div>
                                    <h4 className="text-2xl sm:text-xl font-bold text-gray-800 dark:text-white mb-4">
                                        {feature.title}
                                    </h4>
                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-base sm:text-sm">
                                        {feature.desc}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Community Platforms */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
                    className="mb-24"
                >
                    <h3 className="text-3xl lg:text-2xl font-extrabold text-center mb-12 text-gray-900 dark:text-white tracking-tight">
                        Connect With Our Community
                    </h3>
                    <div className="grid grid-cols-3 lg:grid-cols-2 sm:grid-cols-1 gap-8">
                        {platforms.map((platform, index) => (
                            <motion.a
                                key={platform.name}
                                href={platform.href}
                                target="_blank"
                                rel="noopener noreferrer"
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
                                className="relative bg-gradient-to-br from-caramel/5 via-orange-50/30 to-caramel/5 dark:from-caramel/10 dark:via-orange-900/20 dark:to-caramel/10 rounded-3xl p-8 sm:p-6 border border-caramel/20 dark:border-caramel/30 overflow-hidden group"
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
                                <div className="relative z-10 flex sm:flex-col items-start sm:items-center gap-6 sm:gap-4">
                                    <motion.div
                                        className="w-16 h-16 bg-caramel/10 dark:bg-caramel/20 rounded-2xl flex items-center justify-center transition-transform duration-300 text-2xl text-caramel"
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
                                        {platform.icon}
                                    </motion.div>
                                    <div className="flex-1 sm:text-center">
                                        <h3 className="text-2xl sm:text-xl font-bold text-gray-800 dark:text-white mb-3">
                                            {platform.name}
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-base sm:text-sm">
                                            {platform.desc}
                                        </p>
                                    </div>
                                </div>
                            </motion.a>
                        ))}
                    </div>
                </motion.div>

                {/* Contribution Pathways */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
                    className="mb-24"
                >
                    <h3 className="text-3xl lg:text-2xl font-extrabold text-center mb-12 text-gray-900 dark:text-white tracking-tight">
                        Contribution Pathways
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-1 gap-8 sm:gap-6">
                        {contributions.map((contribution, index) => (
                            <motion.div
                                key={contribution.title}
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
                                className="relative bg-gradient-to-br from-caramel/5 via-orange-50/30 to-caramel/5 dark:from-caramel/10 dark:via-orange-900/20 dark:to-caramel/10 rounded-3xl p-8 sm:p-6 border border-caramel/20 dark:border-caramel/30 overflow-hidden group"
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
                                <div className="relative z-10 flex sm:flex-col items-start sm:items-center gap-6 sm:gap-4">
                                    <motion.div
                                        className="text-4xl sm:text-3xl transition-transform duration-300 text-caramel"
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
                                        {contribution.icon}
                                    </motion.div>
                                    <div className="flex-1 sm:text-center">
                                        <h4 className="text-2xl sm:text-xl font-bold text-gray-800 dark:text-white mb-3">
                                            {contribution.title}
                                        </h4>
                                        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed text-base sm:text-sm">
                                            {contribution.desc}
                                        </p>
                                        <motion.a
                                            href={contribution.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-caramel to-orange-600 text-white rounded-full font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-xl"
                                            whileHover={{
                                                scale: 1.05,
                                                transition: { duration: 0.2 }
                                            }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            {contribution.action}
                                        </motion.a>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Call to Action */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
                    className="text-center bg-gradient-to-r from-caramel to-orange-600 rounded-3xl p-12 lg:p-8 text-white shadow-2xl"
                >
                    <h3 className="text-3xl lg:text-2xl font-semibold mb-6 tracking-tight">
                        Ready to Make a Difference?
                    </h3>
                    <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto leading-relaxed">
                        Join our mission to create ethical, transparent, and user-first shopping tools. Your contribution, no matter how small, helps build a better internet for everyone.
                    </p>
                    <div className="flex justify-center gap-6 lg:flex-col lg:items-center lg:gap-4">
                        <motion.a
                            href="https://github.com/DevinoSolutions/caramel"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-8 py-4 bg-white text-caramel hover:bg-orange-50 font-semibold rounded-full transition-all duration-200 shadow-md hover:shadow-xl"
                            whileHover={{
                                scale: 1.05,
                                transition: { duration: 0.2 }
                            }}
                            whileTap={{ scale: 0.95 }}
                        >
                            View on GitHub
                        </motion.a>
                        <motion.a
                            href="https://discord.gg/buzn7N5c"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-8 py-4 bg-transparent border-2 border-white text-white hover:bg-white hover:text-caramel font-semibold rounded-full transition-all duration-200"
                            whileHover={{
                                scale: 1.05,
                                transition: { duration: 0.2 }
                            }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Join Discord
                        </motion.a>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}