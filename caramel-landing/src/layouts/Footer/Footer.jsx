import React from "react";
import { motion } from "framer-motion";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <motion.footer
            className="bg-caramel text-white py-6 mt-auto justify-end"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
        >
            {/* Example "wave" at the top of the footer */}
            <div className="relative w-full h-6 -mt-6 overflow-hidden">
                <svg
                    className="absolute top-0 left-0 w-full h-full text-caramel"
                    viewBox="0 0 1440 320"
                    preserveAspectRatio="none"
                    fill="currentColor"
                >
                    <path d="M0,96L80,101.3C160,107,320,117,480,144C640,171,800,213,960,224C1120,235,1280,213,1360,202.7L1440,192L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
                </svg>
            </div>

            <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
                <p className="text-sm mb-2 md:mb-0">
                    &copy; {currentYear} Caramel. All Rights Reserved.
                </p>
                <p className="text-sm">
                    Powered by{" "}
                    <a
                        href="https://www.devino.ca/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-semibold"
                    >
                        devino
                    </a>
                </p>
            </div>
        </motion.footer>
    );
}
