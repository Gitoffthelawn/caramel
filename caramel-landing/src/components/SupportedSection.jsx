"use client";

import Image from "next/image";
import React, { useContext } from "react";
import { motion } from "framer-motion";
import { ThemeContext } from "@/lib/contexts";

const featuredStores = [
    {
        name: "Amazon",
        desc: "World's largest online retailer",
        image: "/amazon.png",
        imageLight: "/amazon-light.png",
        category: "marketplace"
    },
    {
        name: "eBay",
        desc: "Auction marketplace for buyers & sellers",
        image: "/ebay.png",
        category: "marketplace"
    },
    {
        name: "CodeAcademy",
        desc: "Interactive platform to learn coding",
        image: "/codeAcademy.png",
        category: "education"
    },
    {
        name: "Best Buy",
        desc: "Electronics and tech retailer",
        image: "/bestbuy.png",
        category: "electronics"
    },
    {
        name: "Target",
        desc: "Department store chain",
        image: "/target.png",
        category: "retail"
    },
    {
        name: "Walmart",
        desc: "Multinational retail corporation",
        image: "/walmart.png",
        category: "retail"
    },
    {
        name: "Nike",
        desc: "Athletic footwear and apparel",
        image: "/nike.png",
        category: "fashion"
    },
    {
        name: "Adidas",
        desc: "Sports clothing and accessories",
        image: "/adidas.png",
        category: "fashion"
    }
];

export default function SupportedSection() {
    const { isDarkMode } = useContext(ThemeContext);

    return (
        <section id="supported" className="py-32 dark:bg-darkBg relative overflow-hidden">
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
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    className="mb-24"
                >
                    <div className="relative w-full overflow-hidden">
                        <motion.div
                            className="flex"
                            animate={{ x: ["0%", "-100%"] }}
                            transition={{
                                x: {
                                    repeat: Infinity,
                                    repeatType: "loop",
                                    duration: 20,
                                    ease: "linear"
                                }
                            }}
                            style={{ width: `${featuredStores.length * 25}%` }}
                        >
                            {[...featuredStores, ...featuredStores].map((store, index) => (
                                <motion.div
                                    key={`${store.name}-${index}`}
                                    className="relative bg-gradient-to-br from-white via-gray-50 to-white dark:from-darkerBg dark:via-gray-900 dark:to-darkerBg rounded-3xl p-8 sm:p-6 border border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0 mx-2"
                                    style={{ width: `${100 / featuredStores.length}%` }}
                                    whileHover={{ scale: 1.03, boxShadow: "0 30px 60px rgba(234,105,37,0.2)" }}
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
                                        <div className="relative mb-6 mx-auto w-20 h-20">
                                            <Image
                                                src={isDarkMode && store.imageLight ? store.imageLight : store.image}
                                                alt={store.name}
                                                width={80}
                                                height={80}
                                                className="object-contain"
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

                {/* Stats Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                    className="mb-24"
                >
                    <h3 className="text-3xl lg:text-2xl font-semibold text-center mb-12 text-gray-800 dark:text-white tracking-tight">
                        Growing Every Day
                    </h3>
                    <div className="grid grid-cols-4 lg:grid-cols-2 sm:grid-cols-1 gap-8 sm:gap-6">
                        {[
                            { value: "5,000+", label: "Supported Stores" },
                            { value: "1M+", label: "Coupons Found" },
                            { value: "$50M+", label: "Total Savings" },
                            { value: "100K+", label: "Happy Users" }
                        ].map((stat, index) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, x: index % 2 === 0 ? -100 : 100 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, delay: index * 0.2, type: "spring", bounce: 0.4 }}
                                whileHover={{ scale: 1.02, boxShadow: "0 30px 60px rgba(234,105,37,0.2)" }}
                                className="relative bg-gradient-to-br from-white via-gray-50 to-white dark:from-darkerBg dark:via-gray-900 dark:to-darkerBg rounded-3xl p-8 sm:p-6 border border-gray-200 dark:border-gray-700 overflow-hidden"
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
                                    <div className="text-4xl sm:text-3xl font-bold text-caramel mb-3">
                                        {stat.value}
                                    </div>
                                    <div className="text-lg sm:text-base text-gray-600 dark:text-gray-400">
                                        {stat.label}
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
                    transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                    className="text-center bg-gradient-to-r from-caramel to-caramelLight rounded-3xl p-12 lg:p-8 text-white shadow-2xl"
                >
                    <h3 className="text-3xl lg:text-2xl font-semibold mb-6 tracking-tight">
                        Don't See Your Favorite Store?
                    </h3>
                    <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto leading-relaxed">
                        We're constantly adding new stores to our platform!
                    </p>
                    <button className="px-8 py-4 bg-white text-caramel hover:bg-gray-100 font-semibold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg">
                        Request a Store
                    </button>
                </motion.div>
            </div>
        </section>
    );
}