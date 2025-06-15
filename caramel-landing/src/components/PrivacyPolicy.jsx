import { motion } from "framer-motion";
import { FaShieldAlt, FaCookie, FaLock, FaUserShield, FaEdit, FaEnvelope } from "react-icons/fa";

const PrivacyPolicy = () => {
    const sections = [
        {
            id: "info-collect",
            title: "What Information Do We Collect?",
            icon: <FaUserShield />,
            content: (
                <>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Caramel may collect the following information to improve your shopping experience:
                    </p>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                        <li className="flex items-start gap-3">
                            <span className="w-2 h-2 bg-caramel rounded-full mt-2 flex-shrink-0"></span>
                            Browser tabs and active tab information for coupon automation.
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="w-2 h-2 bg-caramel rounded-full mt-2 flex-shrink-0"></span>
                            Saved preferences and settings for a customized experience.
                        </li>
                    </ul>
                </>
            )
        },
        {
            id: "info-use",
            title: "How Do We Use Your Information?",
            icon: <FaLock />,
            content: (
                <>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        The information we collect is used to:
                    </p>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                        <li className="flex items-start gap-3">
                            <span className="w-2 h-2 bg-caramel rounded-full mt-2 flex-shrink-0"></span>
                            Automate coupon application and find the best deals for you.
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="w-2 h-2 bg-caramel rounded-full mt-2 flex-shrink-0"></span>
                            Enhance the functionality and performance of Caramel.
                        </li>
                    </ul>
                </>
            )
        },
        {
            id: "info-protect",
            title: "How Do We Protect Your Information?",
            icon: <FaShieldAlt />,
            content: (
                <p className="text-gray-600 dark:text-gray-400">
                    We prioritize your privacy and security. Your personal data is never shared with third parties without your explicit consent. Any browsing or shopping information collected is used solely to improve your experience with Caramel.
                </p>
            )
        },
        {
            id: "cookies",
            title: "Do We Use Cookies?",
            icon: <FaCookie />,
            content: (
                <p className="text-gray-600 dark:text-gray-400">
                    Yes, we use cookies to optimize your shopping experience. Cookies allow us to provide personalized features and analyze performance to better serve you.
                </p>
            )
        },
        {
            id: "data-security",
            title: "Data Security",
            icon: <FaLock />,
            content: (
                <p className="text-gray-600 dark:text-gray-400">
                    We implement industry-standard security measures to protect your information from unauthorized access, breaches, or misuse. Your trust is our priority.
                </p>
            )
        },
        {
            id: "your-choices",
            title: "Your Choices",
            icon: <FaEdit />,
            content: (
                <>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        You have full control over your data:
                    </p>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                        <li className="flex items-start gap-3">
                            <span className="w-2 h-2 bg-caramel rounded-full mt-2 flex-shrink-0"></span>
                            You can uninstall Caramel at any time to stop data collection.
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="w-2 h-2 bg-caramel rounded-full mt-2 flex-shrink-0"></span>
                            You can adjust browser settings to manage cookies.
                        </li>
                    </ul>
                </>
            )
        }
    ];

    return (
        <div className="py-16">
            {/* Introduction */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-16 text-center"
            >
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-caramel/10 text-caramel rounded-full font-semibold text-sm mb-6">
                    <FaShieldAlt className="w-4 h-4" />
                    Effective Date: January 1, 2025
                </div>
                <p className="text-lg text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
                    Welcome to <span className="font-semibold text-caramel">Caramel!</span> This Privacy Policy explains how we collect, use, and protect your information while using our extension. By accessing and using Caramel, you agree to the terms outlined in this Privacy Policy.
                </p>
            </motion.div>

            {/* Privacy Sections */}
            <div className="space-y-8">
                {sections.map((section, index) => (
                    <motion.div
                        key={section.id}
                        initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                        className="relative bg-gradient-to-br from-caramel/5 via-orange-50/30 to-caramel/5 dark:from-caramel/10 dark:via-orange-900/20 dark:to-caramel/10 rounded-3xl p-8 border border-caramel/20 dark:border-caramel/30 overflow-hidden"
                    >
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-5">
                            <motion.div
                                className="w-full h-full"
                                style={{
                                    backgroundImage: `
                                        linear-gradient(90deg, #ea6925 1px, transparent 1px),
                                        linear-gradient(#ea6925 1px, transparent 1px)
                                    `,
                                    backgroundSize: "20px 20px"
                                }}
                                animate={{
                                    backgroundPosition: ["0px 0px", "20px 20px", "0px 0px"]
                                }}
                                transition={{
                                    duration: 8,
                                    repeat: Infinity,
                                    ease: "linear",
                                    repeatType: "loop"
                                }}
                            />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 bg-caramel/10 dark:bg-caramel/20 rounded-2xl flex items-center justify-center text-caramel text-xl flex-shrink-0">
                                    {section.icon}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl lg:text-xl font-bold text-gray-900 dark:text-white mb-4">
                                        {section.title}
                                    </h2>
                                    <div className="text-base leading-relaxed">
                                        {section.content}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Contact and Updates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="bg-gradient-to-br from-caramel/5 via-orange-50/30 to-caramel/5 dark:from-caramel/10 dark:via-orange-900/20 dark:to-caramel/10 rounded-3xl p-8 border border-caramel/20 dark:border-caramel/30"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-caramel/10 dark:bg-caramel/20 rounded-2xl flex items-center justify-center text-caramel text-xl">
                            <FaEdit />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                                Access and Updates
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                You can request to access, update, or delete your personal information by contacting us at:
                            </p>
                            <a
                                href="mailto:hello@devino.ca"
                                className="inline-flex items-center gap-2 text-caramel hover:text-orange-600 font-semibold transition-colors duration-200"
                            >
                                <FaEnvelope className="w-4 h-4" />
                                hello@devino.ca
                            </a>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="bg-gradient-to-br from-caramel/5 via-orange-50/30 to-caramel/5 dark:from-caramel/10 dark:via-orange-900/20 dark:to-caramel/10 rounded-3xl p-8 border border-caramel/20 dark:border-caramel/30"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-caramel/10 dark:bg-caramel/20 rounded-2xl flex items-center justify-center text-caramel text-xl">
                            <FaEnvelope />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                                Contact Us
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                If you have any questions or concerns about this Privacy Policy, feel free to contact us at:
                            </p>
                            <a
                                href="mailto:hello@devino.ca"
                                className="inline-flex items-center gap-2 text-caramel hover:text-orange-600 font-semibold transition-colors duration-200"
                            >
                                <FaEnvelope className="w-4 h-4" />
                                hello@devino.ca
                            </a>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Policy Updates Notice */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="mt-12 text-center bg-gradient-to-r from-caramel to-orange-600 rounded-3xl p-8 text-white"
            >
                <h3 className="text-xl font-semibold mb-4">
                    Changes to This Privacy Policy
                </h3>
                <p className="opacity-90 max-w-3xl mx-auto">
                    This Privacy Policy may be updated periodically to reflect changes in our practices or legal requirements. Any updates will be posted here, and the revised policy will take effect immediately upon posting.
                </p>
            </motion.div>
        </div>
    );
};

export default PrivacyPolicy;