import PrivacyPolicy from "@/components/PrivacyPolicy";
import AppHeader from "@/components/AppHeader";
import Doodles from "@/components/Doodles";
import React from "react";
import { motion } from "framer-motion";

const Privacy = () => {
    return (
        <main className="w-full relative overflow-x-clip -mt-[6.7rem] dark:bg-darkBg">
            <AppHeader description={"Caramel Privacy Policy"} ogTitle={"Privacy page"} />
            <Doodles />

            <div className="scroll-smooth">
                {/* Hero Section */}
                <section
                    className="relative mt-[5rem] min-h-[50vh] dark:text-white flex flex-col justify-center overflow-hidden px-6 py-16 text-gray-800">
                    <div className="max-w-6xl mx-auto text-center">
                        <motion.div
                            initial={{opacity: 0, y: 30}}
                            animate={{opacity: 1, y: 0}}
                            transition={{duration: 0.6, ease: "easeOut"}}
                            className="mb-8"
                        >
                            <h1 className="text-5xl leading-[90px] lg:text-4xl md:text-3xl font-extrabold mb-6 bg-gradient-to-r from-caramel to-orange-600 bg-clip-text text-transparent tracking-tight">
                                Privacy Policy
                            </h1>
                            <p className="text-xl lg:text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
                                We value your privacy and are committed to protecting your personal information
                            </p>
                        </motion.div>
                    </div>
                </section>

                <motion.div
                    className="relative h-px"
                    initial={{scaleX: 0}}
                    whileInView={{scaleX: 1}}
                    viewport={{once: true}}
                    transition={{duration: 2, delay: 0.4}}
                >
                    <div className="h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent"></div>
                    <div
                        className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-orange-300/20 to-transparent blur-sm"></div>
                </motion.div>
                
                {/* Content Section */}
                <motion.div
                    initial={{opacity: 0, y: 30}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.6, delay: 0.2, ease: "easeOut"}}
                    className="max-w-6xl mx-auto px-6 lg:px-8 pb-16"
                >
                    <PrivacyPolicy/>
                </motion.div>
            </div>
        </main>
    );
};

export default Privacy;