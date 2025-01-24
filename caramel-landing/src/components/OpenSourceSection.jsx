"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";

const platforms = [
    {
        name: "GitHub",
        href: "https://github.com/DevinoSolutions/caramel",
        desc: "Explore our open-source code",
        img: "/github.png"
    },
    {
        name: "Discord",
        href: "https://discord.gg/buzn7N5c",
        desc: "Join our dev community",
        img: "/discord.png"
    },
    {
        name: "Instagram",
        href: "https://www.instagram.com/grab.caramel/",
        desc: "Follow us for updates",
        img: "/instagram.png"
    },
    // {
    //     name: "Facebook",
    //     href: "https://facebook.com/YourFacebook",
    //     desc: "Stay connected with us",
    //     img: "/facebook.png"
    // }
];

export default function OpenSourceSection() {
    return (
        <section id="opensource" className="bg-white py-16">
            <div className="max-w-6xl mx-auto px-6">
                <motion.div
                    className="
                        max-w-6xl mx-auto
                        text-5xl md:text-xl font-bold mb-6 justify-center
                        bg-clip-text text-black/80"
                >
                    Open Source & Community Driven
                </motion.div>
                <motion.p
                    initial={{opacity: 0, y: 10}}
                    whileInView={{opacity: 1, y: 0}}
                    transition={{duration: 0.5, delay: 0.1}}
                    viewport={{once: true}}
                    className="text-gray-600 text-left mb-8 "
                >
                    We believe in transparency. Caramel is open source, and we warmly
                    welcome your contributions or suggestions! Join our community and
                    help make online shopping more affordable for everyone.
                </motion.p>
                <div className="
            grid grid-cols-3
            lg:grid-cols-1
            md:grid-cols-1
            gap-8">
                    {platforms.map((plat, index) => (
                        <motion.a
                            key={plat.name}
                            href={plat.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{opacity: 0, y: 20}}
                            whileInView={{opacity: 1, y: 0}}
                            viewport={{once: true}}
                            transition={{duration: 0.4, delay: index * 0.1}}
                            whileHover={{scale: 1.05}}
                            className="bg-gray-50 rounded-lg p-6 flex flex-col items-center justify-center shadow hover:shadow-lg cursor-pointer"
                        >
                            <Image
                                src={plat.img}
                                alt={plat.name}
                                width={64}
                                height={64}
                                className="mb-4 object-contain"
                            />
                            <h3 className="text-lg font-semibold text-caramel">{plat.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{plat.desc}</p>
                        </motion.a>
                    ))}
                </div>
            </div>
        </section>
    );
}
