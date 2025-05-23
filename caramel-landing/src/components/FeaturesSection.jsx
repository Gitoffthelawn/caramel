"use client";

import Image from "next/image";
import React, { useContext, useState } from "react";
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

const categories = [
    { name: "All", value: "all", icon: "🏪" },
    { name: "Marketplaces", value: "marketplace", icon: "🛒" },
    { name: "Electronics", value: "electronics", icon: "📱" },
    { name: "Fashion", value: "fashion", icon: "👕" },
    { name: "Education", value: "education", icon: "📚" },
    { name: "Retail", value: "retail", icon: "🏬" }
];

export default function SupportedSection() {
    const { isDarkMode } = useContext(ThemeContext);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [isGridView, setIsGridView] = useState(true);

    const filteredStores = selectedCategory === "all"
        ? featuredStores
        : featuredStores.filter(store => store.category === selectedCategory);

    return (
        <section className="py-24 dark:bg-darkBg relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 opacity-10">
                <motion.div
                    className="absolute top-20 left-20 w-40 h-40 bg-caramel rounded-full blur-3xl"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute bottom-20 right-20 w-32 h-32 bg-caramelLight rounded-full blur-3xl"
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.2, 0.1, 0.2]
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 2
                    }}
                />
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-5xl md:text-3xl font-bold mb-6 bg-gradient-to-r from-caramel to-caramelLight bg-clip-text text-transparent">
                        5,000+ Supported Stores
                    </h2>
                    <p className="text-xl md:text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
                        From major retailers to niche marketplaces, Caramel works everywhere you shop online
                    </p>

                    {/* View Toggle */}
                    <div className="flex justify-center items-center gap-4 mb-8">
                        <button
                            onClick={() => setIsGridView(true)}
                            className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                                isGridView
                                    ? 'bg-caramel text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}
                        >
                            Grid View
                        </button>
                        <button
                            onClick={() => setIsGridView(false)}
                            className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                                !isGridView
                                    ? 'bg-caramel text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}
                        >
                            Carousel View
                        </button>
                    </div>

                    {/* Category Filter */}
                    <div className="flex justify-center flex-wrap gap-3 mb-12">
                        {categories.map((category) => (
                            <button
                                key={category.value}
                                onClick={() => setSelectedCategory(category.value)}
                                className={`px-4 py-2 rounded-full transition-all duration-300 text-sm font-medium ${
                                    selectedCategory === category.value
                                        ? 'bg-caramel text-white shadow-lg'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            >
                                <span className="mr-2">{category.icon}</span>
                                {category.name}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Grid View */}
                {isGridView && (
                    <motion.div
                        layout
                        className="grid grid-cols-4 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-6"
                    >
                        {filteredStores.map((store, index) => (
                            <motion.div
                                key={`${store.name}-${index}`}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                whileHover={{
                                    scale: 1.05,
                                    boxShadow: "0 20px 40px rgba(234, 105, 37, 0.1)"
                                }}
                                className="bg-white dark:bg-darkerBg rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-800 text-center group cursor-pointer"
                            >
                                <div className="relative mb-4 overflow-hidden rounded-xl">
                                    <Image
                                        src={(isDarkMode && store.imageLight) ? store.imageLight : store.image}
                                        alt={store.name}
                                        width={80}
                                        height={80}
                                        className="mx-auto object-contain group-hover:scale-110 transition-transform duration-300"
                                    />
                                </div>
                                <h3 className="text-lg font-bold text-caramel mb-2 group-hover:text-caramelLight transition-colors">
                                    {store.name}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                                    {store.desc}
                                </p>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {/* Carousel View */}
                {!isGridView && (
                    <div className="relative w-full h-[600px] overflow-hidden" style={{ perspective: "1000px" }}>
                        <motion.div
                            className="relative w-full h-full"
                            style={{ transformStyle: "preserve-3d" }}
                            animate={{ rotateY: 360 }}
                            transition={{
                                duration: 40,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                        >
                            {filteredStores.map((store, index) => {
                                const angleStep = 360 / filteredStores.length;
                                const rotateY = index * angleStep;
                                const radius = 28;

                                return (
                                    <motion.div
                                        key={`${store.name}-carousel-${index}`}
                                        className="absolute top-1/2 left-1/2 w-64 h-64 md:w-48 md:h-48 p-6 bg-white dark:bg-darkerBg rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 flex flex-col justify-center items-center text-center group"
                                        style={{
                                            transformStyle: "preserve-3d",
                                            transform: `
                                                translate(-50%, -50%)
                                                rotateY(${rotateY}deg)
                                                translateZ(${radius}rem)
                                            `
                                        }}
                                        whileHover={{ scale: 1.1 }}
                                    >
                                        <div className="relative mb-4">
                                            <Image
                                                src={(isDarkMode && store.imageLight) ? store.imageLight : store.image}
                                                alt={store.name}
                                                width={80}
                                                height={80}
                                                className="object-contain group-hover:scale-110 transition-transform duration-300"
                                            />
                                        </div>
                                        <h3 className="text-xl md:text-lg font-bold text-caramel mb-2 group-hover:text-caramelLight transition-colors">
                                            {store.name}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                                            {store.desc}
                                        </p>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </div>
                )}

                {/* Stats Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="mt-20 bg-gradient-to-r from-caramel to-caramelLight rounded-3xl p-12 md:p-8 text-white text-center"
                >
                    <h3 className="text-3xl md:text-2xl font-bold mb-8">Growing Every Day</h3>
                    <div className="grid grid-cols-4 md:grid-cols-2 gap-8">
                        <div>
                            <div className="text-4xl md:text-3xl font-bold mb-2">5,000+</div>
                            <div className="text-lg opacity-90">Supported Stores</div>
                        </div>
                        <div>
                            <div className="text-4xl md:text-3xl font-bold mb-2">1M+</div>
                            <div className="text-lg opacity-90">Coupons Found</div>
                        </div>
                        <div>
                            <div className="text-4xl md:text-3xl font-bold mb-2">$50M+</div>
                            <div className="text-lg opacity-90">Total Savings</div>
                        </div>
                        <div>
                            <div className="text-4xl md:text-3xl font-bold mb-2">100K+</div>
                            <div className="text-lg opacity-90">Happy Users</div>
                        </div>
                    </div>
                </motion.div>

                {/* Call to Action */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="mt-16 text-center"
                >
                    <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                        Don't see your favorite store? We're constantly adding new ones!
                    </p>
                    <button className="px-8 py-4 bg-caramel hover:bg-caramelLight text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                        Request a Store
                    </button>
                </motion.div>
            </div>
        </section>
    );
}