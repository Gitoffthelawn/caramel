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
                    <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent blur-sm"></div>

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
                    <div className="h-px bg-gradient-to-r from-transparent via-orange-600/40 to-transparent"></div>
                    <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-caramel/20 to-transparent blur-sm"></div>
                </motion.div>

                <SupportedSection />

                <motion.div
                    className="relative h-px"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 2, delay: 0.4 }}
                >
                    <div className="h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent"></div>
                    <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-orange-300/20 to-transparent blur-sm"></div>
                </motion.div>

                <OpenSourceSection />
            </div>
        </main>
    );
}