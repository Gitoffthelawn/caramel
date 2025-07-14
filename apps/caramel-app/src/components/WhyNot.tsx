"use client";

import React, { useState, useContext } from "react";
import { motion } from "framer-motion";
import { ThemeContext } from "@/lib/contexts";
import { FaPlay, FaExternalLinkAlt, FaShieldAlt, FaEye, FaHandHoldingHeart, FaTimesCircle } from "react-icons/fa";

const problemsWithHoney = [
    {
        title: "Affiliate Link Hijacking",
        desc: "Honey secretly replaces creators' affiliate links with their own, stealing commissions from content creators you want to support",
        icon: <FaTimesCircle />
    },
    {
        title: "Hidden Data Collection",
        desc: "Your browsing data, purchase history, and personal information is collected and sold to third parties without clear disclosure",
        icon: <FaEye />
    },
    {
        title: "Creator Revenue Loss",
        desc: "YouTubers, bloggers, and influencers lose millions in rightful earnings when Honey overrides their referral links",
        icon: <FaHandHoldingHeart />
    },
    {
        title: "Closed Source Operation",
        desc: "You can't verify what Honey actually does behind the scenes - their code is completely hidden from public scrutiny",
        icon: <FaShieldAlt />
    }
];

const caramelSolutions = [
    {
        title: "Respects Creator Links",
        desc: "We never override affiliate links - creators keep 100% of their rightful commissions"
    },
    {
        title: "Zero Data Collection",
        desc: "Your browsing habits stay private - we don't track, store, or sell your personal information"
    },
    {
        title: "Supports Content Creators",
        desc: "Help sustain the creators you love while still getting the best deals available"
    },
    {
        title: "Fully Open Source",
        desc: "Every line of code is public and auditable - see exactly what we do with your data"
    }
];

export default function WhyNotHoneySection() {
    const { isDarkMode } = useContext(ThemeContext);
    const [videoLoaded, setVideoLoaded] = useState(false);

    return (
        <section id="why-not" className="py-32 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-caramel/20 to-transparent"></div>
                {/* Floating warning elements */}
                <motion.div
                    className="absolute top-1/4 left-1/6 w-24 h-24 bg-red-500/5 rounded-full blur-xl"
                    animate={{
                        x: [0, 20, 0],
                        y: [0, -15, 0],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute top-3/4 right-1/6 w-20 h-20 bg-orange-500/5 rounded-full blur-lg"
                    animate={{
                        x: [0, -15, 0],
                        y: [0, 20, 0],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 2
                    }}
                />
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
                    <h2 className="text-5xl lg:text-4xl leading-[80px] font-extrabold mb-8 text-caramel tracking-tight">
                        Why Not Just Use Honey?
                    </h2>
                    <p className="text-xl lg:text-lg text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed mb-8">
                        Reports show <span className="text-red-600 font-semibold">Honey and many other extensions override affiliate links</span> — cutting creatorsʼ revenue and your savings. <span className="text-caramel font-semibold">Caramel is the transparent, open-source fix.</span> <span className="font-semibold">Watch why →</span>
                    </p>

                    {/* Video Section */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="max-w-4xl mx-auto mb-16"
                    >
                        <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl aspect-video">
                            {!videoLoaded && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                                    <motion.button
                                        onClick={() => setVideoLoaded(true)}
                                        className="flex items-center gap-4 px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold transition-all duration-300 shadow-lg"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <FaPlay className="text-lg" />
                                        Watch: The Truth About Honey
                                    </motion.button>
                                </div>
                            )}
                            {videoLoaded && (
                                <iframe
                                    src="https://www.youtube.com/embed/vc4yL3YTwWk?autoplay=1"
                                    title="The Truth About Honey"
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            )}
                        </div>
                        <motion.a
                            href="https://www.youtube.com/watch?v=vc4yL3YTwWk"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mt-4 text-sm text-gray-600 dark:text-gray-400 hover:text-caramel transition-colors duration-200"
                            whileHover={{ scale: 1.02 }}
                        >
                            <FaExternalLinkAlt />
                            Watch on YouTube
                        </motion.a>
                    </motion.div>
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
                        Make the Switch to Caramel
                    </h3>
                    <p className="text-lg opacity-90 mb-8 max-w-3xl mx-auto leading-relaxed">
                        Join thousands of users whoʼve made the switch to Caramel. Save money while supporting the creators you love, all with complete transparency and privacy protection.
                    </p>
                    <div className="flex justify-center gap-6 lg:flex-col lg:items-center lg:gap-4">
                        <motion.a
                            href="#install-extension"
                            className="inline-flex items-center px-8 py-4 bg-white text-caramel hover:bg-orange-50 font-semibold rounded-full transition-all duration-200 shadow-md hover:shadow-xl"
                            whileHover={{
                                scale: 1.05,
                                transition: { duration: 0.2 }
                            }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Install Caramel Now
                        </motion.a>
                        <motion.a
                            href="#features"
                            className="inline-flex items-center px-8 py-4 bg-transparent border-2 border-white text-white hover:bg-white hover:text-caramel font-semibold rounded-full transition-all duration-200"
                            whileHover={{
                                scale: 1.05,
                                transition: { duration: 0.2 }
                            }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Learn More About Caramel
                        </motion.a>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}