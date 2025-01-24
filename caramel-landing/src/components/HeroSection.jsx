"use client"; // If you're using Next 13+ App Router and need client-side code

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import StoreButtons from "@/components/StoreButtons";

export default function HeroSection() {


    return (
        <section
            className="relative mt-[5rem] min-h-screen flex flex-col justify-center overflow-hidden px-6 py-16 bg-gray-50 text-gray-800"
        >
            <div className="relative z-10 max-w-6xl mx-auto text-center">
                <motion.h1
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.6}}
                    className="text-5xl md:text-3xl flex flex-col justify-center font-bold mb-6"
                >
                    {/* Animated text */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="
                        m-auto text-black/70 drop-shadow-2xl"
                    >
                        Welcome to
                    </motion.div>
                    <Image
                        src="/full-logo.png"
                        alt="logo"
                        height={2000}
                        width={2000}
                        className="m-auto "
                    />
                </motion.h1>
                <motion.p
                    initial={{opacity: 0, y: 10}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.8}}
                    className="text-xl md:text-sm text-gray-600 max-w-2xl mx-auto mb-8"
                >
                    Caramel is the best way to save money on your online shopping. Our
                    browser extension automatically applies the best coupon code at
                    checkout.
                </motion.p>
            </div>
        </section>
    );
}
