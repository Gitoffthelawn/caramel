"use client";

import React, {useContext} from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {ThemeContext} from "@/lib/contexts";

export default function StoreButtons() {
    const { isDarkMode } = useContext(ThemeContext)
    return (
        <div className="flex flex-col mt-20 gap-4 justify-center">
            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.6}}
                className=" m-auto text-3xl text-start w-full md:text-lg font-bold dark:text-white text-black drop-shadow-2xl"
            >
                Where to get Caramel?
            </motion.div>
            <div className="
            grid grid-cols-2
            xs:grid-cols-1
            gap-8">
                <motion.a
                    href="https://chrome.google.com/webstore"
                    target="_blank"
                    className="px-3 pointer-events-none opacity-60 py-1.5 hover:scale-105 dark:text-white dark:border-white hover:bg-caramel hover:text-white transition-transform duration-200 ease-in-out flex gap-2 items-center rounded-xl border-[1.5px] hover:border-caramel border-black text-black/70">
                    <div className="w-10">
                        <Image src={isDarkMode ? "/apple-white.png" : "/apple.png"} alt="Chrome" width={40} height={40}/>
                    </div>
                    <div className="w-full">
                        <div className="text-sm md:text-xs font-extrabold">Download on</div>
                        <div className="text-2xl md:text-sm w-full flex justify-between">
                            <span>Play Store</span>
                            <span className="text-xs my-auto">Coming soon</span>
                        </div>

                    </div>
                </motion.a>
                <motion.a
                    target="_blank"
                    href="https://chrome.google.com/webstore"
                    className="px-3 py-1.5 hover:scale-105 pointer-events-none opacity-65 dark:text-white dark:border-white hover:bg-caramel hover:text-white transition-transform duration-200 ease-in-out flex gap-2 items-center rounded-xl border-[1.5px] hover:border-caramel border-black text-black/70">
                <div className="w-10">
                        <Image src="/chrome.png" alt="Chrome" width={40} height={40}/>
                    </div>
                    <div className="w-full">
                        <div className="text-sm md:text-xs font-extrabold">Download on the</div>
                        <div className="text-2xl md:text-sm flex justify-between">
                            <span>Chrome extension store</span>
                            <span className="text-xs my-auto">Coming soon</span>
                        </div>
                    </div>
                </motion.a>
            </div>
        </div>
    );
}
