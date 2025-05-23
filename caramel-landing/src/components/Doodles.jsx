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

            {/* Floating geometric shapes */}
            <motion.div
                className="absolute top-[20vh] left-[10vw] w-4 h-4 bg-caramel/20 rounded-full"
                animate={{
                    y: [0, -20, 0],
                    x: [0, 10, 0],
                    scale: [1, 1.2, 1]
                }}
                transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            <motion.div
                className="absolute top-[60vh] right-[15vw] w-3 h-3 bg-caramelLight/30 rounded-sm rotate-45"
                animate={{
                    y: [0, 15, 0],
                    x: [0, -8, 0],
                    rotate: [45, 135, 45]
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                }}
            />

            <motion.div
                className="absolute top-[40vh] left-[20vw] w-2 h-8 bg-caramel/15 rounded-full"
                animate={{
                    rotate: [0, 360],
                    scale: [1, 1.1, 1]
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />

            <motion.div
                className="absolute top-[80vh] right-[25vw] w-6 h-6 border-2 border-caramelLight/20 rounded-full"
                animate={{
                    y: [0, -25, 0],
                    scale: [1, 0.8, 1],
                    borderWidth: [2, 4, 2]
                }}
                transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 3
                }}
            />

            {/* Additional decorative elements */}
            <motion.svg
                className="absolute top-[30vh] right-[40vw] w-12 h-12 opacity-10"
                viewBox="0 0 24 24"
                fill="none"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
                <path
                    d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"
                    stroke="#ea6925"
                    strokeWidth="2"
                    fill="#ea6925"
                    fillOpacity="0.1"
                />
            </motion.svg>

            <motion.svg
                className="absolute top-[70vh] left-[35vw] w-8 h-8 opacity-15"
                viewBox="0 0 24 24"
                fill="none"
                animate={{
                    rotate: [0, 180, 360],
                    scale: [1, 1.2, 1]
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                }}
            >
                <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                    fill="#da7f52"
                    fillOpacity="0.2"
                />
            </motion.svg>
        </div>
    );
};

export default Doodles;