"use client";

import React, { useContext } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { ThemeContext } from "@/lib/contexts";
import { FaLock, FaEye, FaBan, FaUsers } from "react-icons/fa";

const platforms = [
    {
        name: "GitHub",
        href: "https://github.com/DevinoSolutions/caramel",
        desc: "Explore our open-source code & contribute",
        img: "/github.png",
        imgLight: "/github-light.png",
        color: "from-gray-600 to-gray-800"
    },
    {
        name: "Discord",
        href: "https://discord.gg/buzn7N5c",
        desc: "Join our developer community",
        img: "/discord.png",
        color: "from-indigo-500 to-purple-600"
    },
    {
        name: "Instagram",
        href: "https://www.instagram.com/grab.caramel/",
        desc: "Follow us for updates & tips",
        img: "/instagram.png",
        color: "from-pink-500 to-rose-500"
    }
];

const contributions = [
    {
        title: "Code Contributions",
        desc: "Help improve our algorithms, add new features, or fix bugs",
        icon: "💻",
        action: "Start Contributing"
    },
    {
        title: "Store Requests",
        desc: "Request support for new e-commerce platforms and stores",
        icon: "🏪",
        action: "Request Store"
    },
    {
        title: "Bug Reports",
        desc: "Help us identify and fix issues to improve user experience",
        icon: "🐛",
        action: "Report Bug"
    },
    {
        title: "Feature Ideas",
        desc: "Suggest new features that would benefit the community",
        icon: "💡",
        action: "Suggest Feature"
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
        <section id="opensource" className="py-32 dark:bg-darkBg relative overflow-hidden">
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
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    className="mb-24"
                >
                    <h3 className="text-3xl lg:text-2xl font-semibold text-center mb-12 text-gray-800 dark:text-white tracking-tight">
                        Security Through Transparency
                    </h3>
                    <div className="grid grid-cols-4 lg:grid-cols-2 sm:grid-cols-1 gap-10">
                        {securityFeatures.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, x: index % 2 === 0 ? -100 : 100 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, delay: index * 0.2, type: "spring", bounce: 0.4 }}
                                whileHover={{ scale: 1.02, rotateY: 5, boxShadow: "0 30px 60px rgba(234,105,37,0.2)" }}
                                className="relative bg-gradient-to-br from-white via-gray-50 to-white dark:from-darkerBg dark:via-gray-900 dark:to-darkerBg rounded-3xl p-10 border border-gray-200 dark:border-gray-700 overflow-hidden"
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
                                        className="text-7xl mx-auto mb-6 text-caramel group-hover:scale-110 transition-transform duration-500 flex justify-center items-center"
                                        animate={{ rotate: [0, 10, -10, 0] }}
                                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        {feature.icon}
                                    </motion.div>
                                    <h4 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
                                        {feature.title}
                                    </h4>
                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
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
                    transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                    className="mb-24"
                >
                    <h3 className="text-3xl lg:text-2xl font-semibold text-center mb-12 text-gray-800 dark:text-white tracking-tight">
                        Connect With Our Community
                    </h3>
                    <div className="grid grid-cols-3 lg:grid-cols-2 sm:grid-cols-1 gap-8">
                        {platforms.map((platform, index) => (
                            <motion.a
                                key={platform.name}
                                href={platform.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{ opacity: 0, x: index % 2 === 0 ? -100 : 100 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, delay: index * 0.2, type: "spring", bounce: 0.4 }}
                                whileHover={{ scale: 1.02, rotateY: 5, boxShadow: "0 30px 60px rgba(234,105,37,0.2)" }}
                                className="relative bg-gradient-to-br from-white via-gray-50 to-white dark:from-darkerBg dark:via-gray-900 dark:to-darkerBg rounded-3xl p-10 border border-gray-200 dark:border-gray-700 overflow-hidden"
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
                                <div className="relative z-10 flex items-start gap-8">
                                    <motion.div
                                        className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                                        animate={{ rotate: [0, 10, -10, 0] }}
                                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        <Image
                                            src={isDarkMode && platform.imgLight ? platform.imgLight : platform.img}
                                            alt={platform.name}
                                            width={36}
                                            height={36}
                                            className="object-contain"
                                        />
                                    </motion.div>
                                    <div className="flex-1">
                                        <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
                                            {platform.name}
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed text-lg">
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
                    transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                    className="mb-24"
                >
                    <h3 className="text-3xl lg:text-2xl font-semibold text-center mb-12 text-gray-800 dark:text-white tracking-tight">
                        Contribution Pathways
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-1 gap-10 sm:gap-6">
                        {contributions.map((contribution, index) => (
                            <motion.div
                                key={contribution.title}
                                initial={{ opacity: 0, x: index % 2 === 0 ? -100 : 100 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, delay: index * 0.2, type: "spring", bounce: 0.4 }}
                                whileHover={{ scale: 1.02, rotateY: 5, boxShadow: "0 30px 60px rgba(234,105,37,0.2)" }}
                                className="relative bg-gradient-to-br from-white via-gray-50 to-white dark:from-darkerBg dark:via-gray-900 dark:to-darkerBg rounded-3xl p-10 sm:p-6 border border-gray-200 dark:border-gray-700 overflow-hidden"
                            >
                                <div className="absolute inset-0 opacity-5">
                                    <motion.div
                                        className="w-full h-full"
                                        style={{
                                            backgroundImage: `
                                                linear-gradient(90deg, #ea6925 1px, transparent 1px),
                                                linear-gradient(#ea6925 1px, transient 1px)
                                            `,
                                            backgroundSize: "20px 20px"
                                        }}
                                        animate={{ backgroundPosition: ["0px 0px", "20px 20px", "0px 0px"] }}
                                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                    />
                                </div>
                                <div className="relative z-10 flex sm:flex-col items-start sm:items-center gap-8 sm:gap-4">
                                    <motion.div
                                        className="text-7xl group-hover:scale-110 transition-transform duration-500"
                                        animate={{ rotate: [0, 10, -10, 0] }}
                                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        {contribution.icon}
                                    </motion.div>
                                    <div className="flex-1 text-center sm:text-center">
                                        <div className="flex sm:flex-col items-center sm:items-center gap-4 mb-4">
                                            <h4 className="text-3xl sm:text-2xl font-bold text-gray-800 dark:text-white">
                                                {contribution.title}
                                            </h4>
                                            <div className="flex gap-2 sm:mt-2">
                                                <span className="px-3 py-1 bg-caramel/20 text-caramel rounded-full text-xs font-bold">
                                                    {contribution.difficulty}
                                                </span>
                                                <span className="px-3 py-1 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full text-xs font-bold">
                                                    {contribution.reward}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed text-lg sm:text-base">
                                            {contribution.desc}
                                        </p>
                                        <motion.button
                                            className="group/btn relative px-8 sm:px-6 py-4 sm:py-3 bg-gradient-to-r from-caramel to-caramelLight text-white rounded-2xl font-bold text-lg sm:text-base overflow-hidden"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <span className="relative z-10">{contribution.action}</span>
                                            <motion.div
                                                className="absolute inset-0 bg-gradient-to-r from-caramelLight to-purple-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"
                                            />
                                            <motion.div
                                                className="absolute inset-0 bg-white/20"
                                                animate={{ x: ["-100%", "200%"] }}
                                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                            />
                                        </motion.button>
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
                    transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
                    className="text-center bg-gradient-to-r from-caramel to-caramelLight rounded-3xl p-12 lg:p-8 text-white shadow-2xl"
                >
                    <h3 className="text-3xl lg:text-2xl font-semibold mb-6 tracking-tight">
                        Ready to Make a Difference?
                    </h3>
                    <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto leading-relaxed">
                        Join our mission to create ethical, transparent, and user-first shopping tools. Your contribution, no matter how small, helps build a better internet for everyone.
                    </p>
                    <div className="flex justify-center gap-6 lg:flex-col lg:items-center lg:gap-4">
                        <a
                            href="https://github.com/DevinoSolutions/caramel"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-8 py-4 bg-white text-caramel hover:bg-gray-100 font-semibold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg"
                        >
                            View on GitHub
                        </a>
                        <a
                            href="https://discord.gg/buzn7N5c"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-8 py-4 bg-transparent border-2 border-white text-white hover:bg-white hover:text-caramel font-semibold rounded-full transition-all duration-300"
                        >
                            Join Discord
                        </a>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}