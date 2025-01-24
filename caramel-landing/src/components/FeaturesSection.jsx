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
                                <div
                                    className="
                    absolute w-full h-full
                    bg-white dark:bg-darkerBg rounded-lg shadow-md p-6
                    flex flex-col justify-center items-start
                  "
                                    style={{ backfaceVisibility: "hidden" }}
                                >
                                    <h3 className="text-xl font-semibold text-caramel mb-2">
                                        {feat.title}
                                    </h3>
                                    <p className="text-gray-700 dark:text-white text-sm">{feat.desc}</p>
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
