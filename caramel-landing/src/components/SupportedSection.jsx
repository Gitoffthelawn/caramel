"use client";

import Image from "next/image";
import React, {useContext} from "react";
import { motion } from "framer-motion";
import {ThemeContext} from "@/lib/contexts";

const supportedSites = [
    {
        name: "Amazon.com",
        desc: "World’s largest online retailer",
        image: "/amazon.png",
        imageLight: "/amazon-light.png"
    },
    {
        name: "eBay.com",
        desc: "Auction marketplace for buyers & sellers",
        image: "/ebay.png"
    },
    {
        name: "CodeAcademy",
        desc: "Interactive platform to learn coding",
        image: "/codeAcademy.png"
    },
    {
        name: "Amazon.com",
        desc: "World’s largest online retailer",
        image: "/amazon.png",
        imageLight: "/amazon-light.png"
    },
    {
        name: "eBay.com",
        desc: "Auction marketplace for buyers & sellers",
        image: "/ebay.png"
    },
    {
        name: "CodeAcademy",
        desc: "Interactive platform to learn coding",
        image: "/codeAcademy.png"
    },
    {
        name: "Amazon.com",
        desc: "World’s largest online retailer",
        image: "/amazon.png",
        imageLight: "/amazon-light.png"
    },
    {
        name: "eBay.com",
        desc: "Auction marketplace for buyers & sellers",
        image: "/ebay.png"
    },
    {
        name: "CodeAcademy",
        desc: "Interactive platform to learn coding",
        image: "/codeAcademy.png"
    },
];

export default function SupportedSection() {
    const cardCount = supportedSites.length;
    const angleStep = 360 / cardCount;
    const radius = 28;

    const { isDarkMode } = useContext(ThemeContext)
    return (
        <section className="py-16 dark:bg-darkBg  w-full" >
            <motion.div
                className="
                        max-w-6xl mx-auto
                        px-6
                        text-5xl md:text-xl font-bold mb-6 justify-center
                        bg-clip-text dark:text-white text-black/80"
            >
                Currently Supported Sites
            </motion.div>
            <div className="relative w-full h-[600px] overflow-hidden" style={{perspective: "1000px"}}>
                <motion.div
                    className="relative w-full h-full"
                    style={{transformStyle: "preserve-3d"}}
                    animate={{rotateY: 360}}
                    transition={{
                        duration: 40,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                >
                    <h2 className="text-5xl lg:text-4xl leading-[80px] font-extrabold mb-8 bg-gradient-to-r from-caramel to-orange-600 bg-clip-text text-transparent tracking-tight">
                        5,000+ Supported Stores
                    </h2>
                    <p className="text-xl lg:text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
                        From major retailers to niche marketplaces, Caramel works everywhere you shop online
                    </p>
                </motion.div>

                {/* Carousel View */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                    className="mb-24"
                >
                    <div className="relative w-full overflow-hidden py-4">
                        <motion.div
                            className="flex gap-4"
                            animate={{ x: ["0%", "-50%"] }}
                            transition={{
                                x: {
                                    repeat: Infinity,
                                    repeatType: "loop",
                                    duration: 30,
                                    ease: "linear"
                                }
                            }}
                        >
                            {[...featuredStores, ...featuredStores].map((store, index) => (
                                <motion.div
                                    key={`${store.name}-${index}`}
                                    className="relative bg-gradient-to-br from-caramel/5 via-orange-50/30 to-caramel/5 dark:from-caramel/10 dark:via-orange-900/20 dark:to-caramel/10 rounded-3xl p-8 sm:p-6 border border-caramel/20 dark:border-caramel/30 overflow-hidden flex-shrink-0 group min-w-[280px] lg:min-w-[240px] sm:min-w-[200px]"
                                    whileHover={{
                                        scale: 1.02,
                                        y: -3,
                                        boxShadow: "0 15px 30px rgba(234,105,37,0.12)",
                                        transition: { duration: 0.2 }
                                    }}
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
                                        <div className="relative mb-6 mx-auto w-20 h-20 flex items-center justify-center">
                                            <Image
                                                src={isDarkMode && store.imageLight ? store.imageLight : store.image}
                                                alt={store.name}
                                                width={80}
                                                height={80}
                                                className={`object-contain ${isDarkMode ? 'brightness-0 invert' : ''}`}
                                            />
                                        </div>
                                        <h3 className="text-2xl sm:text-xl font-semibold text-gray-800 dark:text-white mb-3">
                                            {store.name}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                            {store.desc}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </motion.div>

                {/* Call to Action */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
                    className="text-center bg-gradient-to-r from-caramel to-orange-600 rounded-3xl p-12 lg:p-8 text-white shadow-2xl"
                >
                    <h3 className="text-3xl lg:text-2xl font-semibold mb-6 tracking-tight">
                        Don't See Your Favorite Store?
                    </h3>
                    <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto leading-relaxed">
                        We're constantly adding new stores to our platform. Request yours today!
                    </p>
                    <motion.a
                        href="https://github.com/DevinoSolutions/caramel/issues/new?assignees=&labels=store-request&projects=&template=store-request.md&title=%5BStore+Request%5D+Add+support+for+"
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{
                            scale: 1.05,
                            transition: { duration: 0.2 }
                        }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center px-8 py-4 bg-white text-caramel hover:bg-orange-50 font-semibold rounded-full transition-all duration-200 shadow-md hover:shadow-xl"
                    >
                        Request a Store
                    </motion.a>
                </motion.div>
            </div>
        </section>
    );
}
