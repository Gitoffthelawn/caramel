"use client";

import React, { useContext } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { ThemeContext } from "@/lib/contexts";

const platforms = [
    {
        name: "GitHub",
        href: "https://github.com/DevinoSolutions/caramel",
        desc: "Explore our open-source code & contribute",
        img: "/github.png",
        imgLight: "/github-light.png",
        stats: "2.5k+ Stars",
        color: "from-gray-600 to-gray-800"
    },
    {
        name: "Discord",
        href: "https://discord.gg/buzn7N5c",
        desc: "Join our developer community",
        img: "/discord.png",
        stats: "500+ Members",
        color: "from-indigo-500 to-purple-600"
    },
    {
        name: "Instagram",
        href: "https://www.instagram.com/grab.caramel/",
        desc: "Follow us for updates & tips",
        img: "/instagram.png",
        stats: "10k+ Followers",
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
        icon: "🔒"
    },
    {
        title: "Transparent Operations",
        desc: "All code changes are public and reviewable",
        icon: "👁️"
    },
    {
        title: "No Data Collection",
        desc: "We don't store or transmit personal information",
        icon: "🚫"
    },
    {
        title: "Community Oversight",
        desc: "Thousands of developers can audit our code",
        icon: "👥"
    }
];

export default function OpenSourceSection() {
    const { isDarkMode } = useContext(ThemeContext);

    return (
        <section id="opensource" className="py-24 dark:bg-darkBg relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-caramel/30 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-caramel/30 to-transparent"></div>
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                {/* Header Section */}
                <motion.div
                    initial={{opacity: 0, y: 20}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    transition={{duration: 0.6}}
                    className="text-center mb-16"
                >
                    <h2 className="text-5xl md:text-3xl font-bold mb-6 bg-gradient-to-r from-caramel to-caramelLight bg-clip-text text-transparent">
                        Open Source & Community Driven
                    </h2>
                    <p className="text-xl md:text-lg text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
                        Transparency isn't just a buzzword for us—it's our foundation. Every line of code is open,
                        auditable, and community-driven. Join thousands of developers building a better alternative to
                        proprietary extensions.
                    </p>
                </motion.div>

                {/* Security First */}
                <motion.div
                    initial={{opacity: 0, y: 20}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    transition={{duration: 0.6, delay: 0.2}}
                    className="mb-20"
                >
                    <h3 className="text-3xl md:text-2xl font-bold text-center mb-12 text-gray-800 dark:text-white">
                        Security Through Transparency
                    </h3>
                    <div className="grid grid-cols-4 lg:grid-cols-2 md:grid-cols-1 gap-8">
                        {securityFeatures.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                initial={{opacity: 0, y: 20}}
                                whileInView={{opacity: 1, y: 0}}
                                viewport={{once: true}}
                                transition={{duration: 0.5, delay: index * 0.1}}
                                className="text-center group"
                            >
                                <div
                                    className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-caramel/10 to-caramelLight/10 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
                                    {feature.icon}
                                </div>
                                <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                                    {feature.title}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {feature.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Community Platforms */}
                <motion.div
                    initial={{opacity: 0, y: 20}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    transition={{duration: 0.6, delay: 0.4}}
                    className="mb-20"
                >
                    <h3 className="text-3xl md:text-2xl font-bold text-center mb-12 text-gray-800 dark:text-white">
                        Connect With Our Community
                    </h3>
                    <div className="grid grid-cols-3 lg:grid-cols-1 gap-8">
                        {platforms.map((platform, index) => (
                            <motion.a
                                key={platform.name}
                                href={platform.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{opacity: 0, y: 20}}
                                whileInView={{opacity: 1, y: 0}}
                                viewport={{once: true}}
                                transition={{duration: 0.4, delay: index * 0.1}}
                                whileHover={{scale: 1.05, y: -5}}
                                className="group relative overflow-hidden"
                            >
                                <div
                                    className="relative bg-white dark:bg-darkerBg rounded-3xl p-8 shadow-lg border border-gray-100 dark:border-gray-800 hover:shadow-2xl transition-all duration-500">
                                    {/* Background Gradient */}
                                    <div
                                        className={`absolute inset-0 bg-gradient-to-br ${platform.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-3xl`}></div>

                                    <div className="relative z-10 text-center">
                                        <div
                                            className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                            <Image
                                                src={(isDarkMode && platform.imgLight) ? platform.imgLight : platform.img}
                                                alt={platform.name}
                                                width={40}
                                                height={40}
                                                className="object-contain"
                                            />
                                        </div>
                                        <h3 className="text-2xl font-bold text-caramel mb-2 group-hover:text-caramelLight transition-colors">
                                            {platform.name}
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400 mb-4 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                                            {platform.desc}
                                        </p>
                                        <div
                                            className="inline-flex items-center px-4 py-2 bg-caramel/10 text-caramel rounded-full text-sm font-medium">
                                            {platform.stats}
                                        </div>
                                    </div>
                                </div>
                            </motion.a>
                        ))}
                    </div>
                </motion.div>

                {/* Contribution Ways */}
                <motion.div
                    initial={{opacity: 0, y: 20}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    transition={{duration: 0.6, delay: 0.6}}
                    className="mb-20"
                >
                    <h3 className="text-3xl md:text-2xl font-bold text-center mb-12 text-gray-800 dark:text-white">
                        Ways to Contribute
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-8">
                        {contributions.map((contribution, index) => (
                            <motion.div
                                key={contribution.title}
                                initial={{opacity: 0, x: index % 2 === 0 ? -20 : 20}}
                                whileInView={{opacity: 1, x: 0}}
                                viewport={{once: true}}
                                transition={{duration: 0.5, delay: index * 0.1}}
                                className="bg-gradient-to-br from-white to-gray-50 dark:from-darkerBg dark:to-gray-900 rounded-2xl p-8 border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all duration-300 group"
                            >
                                <div className="flex items-start gap-6">
                                    <div className="text-5xl group-hover:scale-110 transition-transform duration-300">
                                        {contribution.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-3">
                                            {contribution.title}
                                        </h4>
                                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                                            {contribution.desc}
                                        </p>
                                        <button
                                            className="px-6 py-2 bg-caramel hover:bg-caramelLight text-white rounded-full text-sm font-medium transition-all duration-300 transform hover:scale-105">
                                            {contribution.action}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    initial={{opacity: 0, y: 100}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    transition={{duration: 1.5, delay: 0.6}}
                    className="mb-32"
                >
                    <motion.h3
                        className="text-6xl md:text-3xl font-bold text-center mb-16 text-gray-800 dark:text-white"
                        transition={{
                            duration: 4,
                            repeat: Infinity
                        }}
                    >
                        Contribution Pathways
                    </motion.h3>

                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-10">
                        {contributions.map((contribution, index) => (
                            <motion.div
                                initial={{opacity: 0, x: index % 2 === 0 ? -100 : 100}}
                                whileInView={{opacity: 1, x: 0}}
                                viewport={{once: true}}
                                transition={{
                                    duration: 1,
                                    delay: index * 0.2,
                                    type: "spring",
                                    bounce: 0.4
                                }}
                                whileHover={{
                                    scale: 1.02,
                                    rotateY: 5,
                                    boxShadow: "0 30px 60px rgba(234,105,37,0.2)"
                                }}
                                className="relative bg-gradient-to-br from-white via-gray-50 to-white dark:from-darkerBg dark:via-gray-900 dark:to-darkerBg rounded-3xl p-10 border border-gray-200 dark:border-gray-700 overflow-hidden"
                            >
                                {/* Animated background grid */}
                                <div className="absolute inset-0 opacity-5">
                                    <motion.div
                                        className="w-full h-full"
                                        style={{
                                            backgroundImage: `
                                                    linear-gradient(90deg, #ea6925 1px, transparent 1px),
                                                    linear-gradient(#ea6925 1px, transparent 1px)
                                                `,
                                            backgroundSize: '20px 20px'
                                        }}
                                        animate={{
                                            backgroundPosition: ['0px 0px', '20px 20px', '0px 0px']
                                        }}
                                        transition={{
                                            duration: 10,
                                            repeat: Infinity,
                                            ease: "linear"
                                        }}
                                    />
                                </div>

                                <div className="relative z-10 flex items-start gap-8">
                                    <motion.div
                                        className="text-7xl group-hover:scale-110 transition-transform duration-500"
                                        animate={{
                                            rotate: [0, 10, -10, 0]
                                        }}
                                        transition={{
                                            duration: 6,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                    >
                                        {contribution.icon}
                                    </motion.div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-4 mb-4">
                                            <h4 className="text-3xl font-bold text-gray-800 dark:text-white">
                                                {contribution.title}
                                            </h4>
                                            <div className="flex gap-2">
                                                    <span
                                                        className="px-3 py-1 bg-caramel/20 text-caramel rounded-full text-xs font-bold">
                                                        {contribution.difficulty}
                                                    </span>
                                                <span
                                                    className="px-3 py-1 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full text-xs font-bold">
                                                        {contribution.reward}
                                                    </span>
                                            </div>
                                        </div>

                                        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed text-lg">
                                            {contribution.desc}
                                        </p>

                                        <motion.button
                                            className="group/btn relative px-8 py-4 bg-gradient-to-r from-caramel to-caramelLight text-white rounded-2xl font-bold text-lg overflow-hidden"
                                            whileHover={{scale: 1.05}}
                                            whileTap={{scale: 0.95}}
                                        >
                                            <span className="relative z-10">{contribution.action}</span>

                                            {/* Button animations */}
                                            <motion.div
                                                className="absolute inset-0 bg-gradient-to-r from-caramelLight to-purple-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"
                                            />

                                            <motion.div
                                                className="absolute inset-0 bg-white/20"
                                                animate={{
                                                    x: ["-100%", "200%"]
                                                }}
                                                transition={{
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    repeatDelay: 3
                                                }}
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
                    initial={{opacity: 0, y: 20}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    transition={{duration: 0.6, delay: 0.8}}
                    className="text-center bg-gradient-to-r from-caramel to-caramelLight rounded-3xl p-12 md:p-8 text-white"
                >
                    <h3 className="text-3xl md:text-2xl font-bold mb-6">
                        Ready to Make a Difference?
                    </h3>
                    <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
                        Join our mission to create ethical, transparent, and user-first shopping tools.
                        Your contribution, no matter how small, helps build a better internet for everyone.
                    </p>
                    <div className="flex justify-center gap-4 md:flex-col md:items-center">
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