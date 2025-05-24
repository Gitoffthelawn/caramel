import { motion } from "framer-motion";

const Doodles = () => {
    return (
        <div className="fixed w-full pointer-events-none z-[1]">
            {/* Top Right Circle */}
            <motion.svg
                className="absolute -right-96 lg:-right-32 top-0 lg:top-10 -translate-y-1/2 w-[50vw] h-[50vw] max-w-[600px] max-h-[600px]"
                viewBox="0 0 200 200"
                fill="none"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1 }}
            >
                <motion.path
                    d="M190,100 C190,160 140,190 100,190 C60,190 10,160 10,100 C10,40 60,10 100,10 C140,10 190,40 190,100Z"
                    stroke="#ea6925"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity="0.15"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                />
                <motion.circle
                    cx="100"
                    cy="100"
                    r="4"
                    fill="#ea6925"
                    fillOpacity="0.3"
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </motion.svg>

            {/* Bottom Left Circle */}
            <motion.svg
                className="absolute -left-[40rem] lg:-left-28 top-[90vh] -translate-y-1/2 w-[50vw] h-[50vw] max-w-[600px] max-h-[600px]"
                viewBox="0 0 200 200"
                fill="none"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
            >
                <motion.path
                    d="M190,100 C190,160 140,190 100,190 C60,190 10,160 10,100 C10,40 60,10 100,10 C140,10 190,40 190,100Z"
                    stroke="#da7f52"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity="0.15"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut", delay: 0.5 }}
                />
                <motion.circle
                    cx="100"
                    cy="100"
                    r="4"
                    fill="#da7f52"
                    fillOpacity="0.3"
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1
                    }}
                />
            </motion.svg>
        </div>
    );
};

export default Doodles;