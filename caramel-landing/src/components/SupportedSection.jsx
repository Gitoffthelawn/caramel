"use client";

import Image from "next/image";
import React from "react";
import { motion } from "framer-motion";

const supportedSites = [
    {
        name: "Amazon.com",
        desc: "World’s largest online retailer",
        image: "/amazon.png"
    },
    {
        name: "eBay.com",
        desc: "Auction marketplace for buyers & sellers",
        image: "/ebay.png"
    },
    {
        name: "CodeAcademy",
        desc: "Interactive platform to learn coding",
        image: "/CodeAcademy.png"
    },
    {
        name: "Amazon.com",
        desc: "World’s largest online retailer",
        image: "/amazon.png"
    },
    {
        name: "eBay.com",
        desc: "Auction marketplace for buyers & sellers",
        image: "/ebay.png"
    },
    {
        name: "CodeAcademy",
        desc: "Interactive platform to learn coding",
        image: "/CodeAcademy.png"
    },
    {
        name: "Amazon.com",
        desc: "World’s largest online retailer",
        image: "/amazon.png"
    },
    {
        name: "eBay.com",
        desc: "Auction marketplace for buyers & sellers",
        image: "/ebay.png"
    },
    {
        name: "CodeAcademy",
        desc: "Interactive platform to learn coding",
        image: "/CodeAcademy.png"
    },
];

export default function SupportedSection() {
    const cardCount = supportedSites.length;
    const angleStep = 360 / cardCount;
    const radius = 28;

    return (
        <section className="py-16 bg-white w-full" >
            <motion.div
                className="
                        max-w-6xl mx-auto
                        px-6
                        text-5xl md:text-xl font-bold mb-6 justify-center
                        bg-clip-text text-black/80"
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
                    {supportedSites.map((site, index) => {
                        const rotateY = index * angleStep;
                        return (
                            <motion.div
                                key={site.name}
                                className="absolute top-1/2 md:h-40 md:w-40 left-1/2 w-52 h-52 p-4 bg-gray-50 rounded-lg shadow-xl flex flex-col justify-center items-center text-center"
                                style={{
                                    transformStyle: "preserve-3d",
                                    transform: `
                    translate(-50%, -50%)
                    rotateY(${rotateY}deg)
                    translateZ(${radius}rem)
                  `
                                }}
                            >
                                <Image
                                    src={site.image}
                                    alt={site.name}
                                    width={80}
                                    height={80}
                                    className="mb-2 md:w-1/2 object-contain"
                                />
                                <h3 className="text-xl font-semibold md:text-xs text-caramel">{site.name}</h3>
                                <p className="mt-2 text-sm md:text-xs text-gray-600">{site.desc}</p>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </section>
    );
}
