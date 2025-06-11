"use client"; // If using the Next.js App Router

import React from "react";
import {motion} from "framer-motion";
import StoreButtons from "@/components/StoreButtons";

const features = [
    {
        title: "Automated Coupon Application",
        desc: "Saves you money by finding and applying the best coupon codes.",
        detail: "We monitor thousands of coupon codes, ensuring you always get the best deal."
    },
    {
        title: "Open Source & Transparent",
        desc: "Our entire codebase is public and community-driven.",
        detail: "Join our GitHub to contribute features, report issues, or request enhancements!"
    },
    {
        title: "Cross-Browser Support",
        desc: "Caramel works on Chrome, Firefox, and more in the near future.",
        detail: "Seamless integration regardless of your browser preference."
    }
];

export default function FeaturesSection() {
    return (
        <section className="dark:bg-darkBg py-16">
            <div className="max-w-6xl mx-auto px-6">
                <motion.div
                    className="
                        m-auto
                        text-5xl md:text-xl font-bold mb-6 justify-center
                        bg-clip-text dark:text-white text-black/80"
                >
                    Features provided by Caramel
                </motion.div>
                <div
                    className="
            grid grid-cols-3
            lg:grid-cols-2
            md:grid-cols-1
            gap-8
          "
                >
                    {features.map((feat, index) => (
                        <div
                            key={index}
                            className="relative group w-full h-64"
                            style={{perspective: "1000px"}}
                        >
                        <div
                                className="
                  relative w-full h-full
                  transition-transform duration-700
                  [transform-style:preserve-3d]
                  group-hover:[transform:rotateY(180deg)]
                "
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
                                    {/* Large icon - hidden on lg and down */}
                                    <motion.div
                                        className="text-6xl mx-auto mb-6 text-caramel transition-transform duration-300 xl:block lg:hidden"
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

                                    {/* Mobile layout - icon + title in one row */}
                                    <div className="hidden lg:block text-left">
                                        <div className="flex items-center mb-3">
                                            <span className="text-2xl text-caramel mr-3 flex-shrink-0">{feat.icon}</span>
                                            <h3 className="text-2xl sm:text-xl font-bold text-gray-800 dark:text-white tracking-tight">
                                                {feat.title}
                                            </h3>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-base sm:text-sm ml-11">
                                            {feat.desc}
                                        </p>
                                    </div>

                                    {/* Desktop layout - original centered layout */}
                                    <div className="xl:block lg:hidden">
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
                                </div>
                                <div
                                    className="
                    absolute w-full h-full
                    bg-caramel text-white rounded-lg shadow-md p-6
                    flex flex-col justify-center items-center
                  "
                                    style={{
                                        transform: "rotateY(180deg)",
                                        backfaceVisibility: "hidden",
                                    }}
                                >
                                    <h3 className="text-xl font-semibold mb-2">{feat.title}</h3>
                                    <p className="text-sm">{feat.detail}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            <StoreButtons />
            </div>
        </section>
    );
}
