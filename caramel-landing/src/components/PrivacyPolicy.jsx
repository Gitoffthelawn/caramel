import { TbListCheck } from "react-icons/tb";

const PrivacyPolicy = () => {
    return (
        <div className="scroller container overflow-x-auto p-8 sm:px-0">
            <div className="relative flex items-center">
                <div className="absolute left-0 top-0">
                    <TbListCheck className="text-3xl text-black dark:text-white" />
                </div>
                <h1 className="mb-6 pl-10 text-3xl font-bold text-black dark:text-white sm:text-xl">
                    Privacy Policy
                </h1>
            </div>

            <div className="space-y-6">
                <div className="text-black dark:text-white font-semibold">
                    Effective Date: <span className="text-gray-700 dark:text-gray-100">01/01/2025</span>
                </div>

                <p className="text-black dark:text-white">
                    Welcome to <b className="font-medium text-caramel">Caramel!</b> This Privacy Policy explains how we collect, use, and protect your information while using our extension. By accessing and using Caramel, you agree to the terms outlined in this Privacy Policy.
                </p>

                <h2 className="mb-2 text-lg font-semibold text-black dark:text-white">
                    What Information Do We Collect?
                </h2>
                <p className="ml-6 text-black dark:text-white sm:ml-2">
                    Caramel may collect the following information to improve your shopping experience:
                </p>
                <ul className="list-disc ml-10 text-black dark:text-white">
                    <li>Browser tabs and active tab information for coupon automation.</li>
                    <li>Saved preferences and settings for a customized experience.</li>
                </ul>

                <h2 className="mb-2 text-lg font-semibold text-black dark:text-white">
                    How Do We Use Your Information?
                </h2>
                <p className="ml-6 text-black dark:text-white sm:ml-2">
                    The information we collect is used to:
                </p>
                <ul className="list-disc ml-10 text-black dark:text-white">
                    <li>Automate coupon application and find the best deals for you.</li>
                    <li>Enhance the functionality and performance of Caramel.</li>
                </ul>

                <h2 className="mb-2 text-lg font-semibold text-black dark:text-white">
                    How Do We Protect Your Information?
                </h2>
                <p className="ml-6 text-black dark:text-white sm:ml-2">
                    We prioritize your privacy and security. Your personal data is never shared with third parties without your explicit consent. Any browsing or shopping information collected is used solely to improve your experience with Caramel.
                </p>

                <h2 className="mb-2 text-lg font-semibold text-black dark:text-white">
                    Do We Use Cookies?
                </h2>
                <p className="ml-6 text-black dark:text-white sm:ml-2">
                    Yes, we use cookies to optimize your shopping experience. Cookies allow us to provide personalized features and analyze performance to better serve you.
                </p>

                <h2 className="mb-2 text-lg font-semibold text-black dark:text-white">
                    Data Security
                </h2>
                <p className="ml-6 text-black dark:text-white sm:ml-2">
                    We implement industry-standard security measures to protect your information from unauthorized access, breaches, or misuse. Your trust is our priority.
                </p>

                <h2 className="mb-2 text-lg font-semibold text-black dark:text-white">
                    Your Choices
                </h2>
                <p className="ml-6 text-black dark:text-white sm:ml-2">
                    You have full control over your data:
                </p>
                <ul className="list-disc ml-10 text-black dark:text-white">
                    <li>You can uninstall Caramel at any time to stop data collection.</li>
                    <li>You can adjust browser settings to manage cookies.</li>
                </ul>

                <h2 className="mb-2 text-lg font-semibold text-black dark:text-white">
                    Access and Updates
                </h2>
                <p className="ml-6 text-black dark:text-white sm:ml-2">
                    You can request to access, update, or delete your personal information by contacting us at:
                    <a
                        href="mailto:hello@devino.ca"
                        className="text-caramel underline"
                    >
                        hello@devino.ca
                    </a>
                </p>

                <h2 className="mb-2 text-lg font-semibold text-black dark:text-white">
                    Changes to This Privacy Policy
                </h2>
                <p className="ml-6 text-black dark:text-white sm:ml-2">
                    This Privacy Policy may be updated periodically to reflect changes in our practices or legal requirements. Any updates will be posted here, and the revised policy will take effect immediately upon posting.
                </p>

                <h2 className="mb-2 text-lg font-semibold text-black dark:text-white">
                    Contact Us
                </h2>
                <p className="ml-6 text-black dark:text-white sm:ml-2">
                    If you have any questions or concerns about this Privacy Policy, feel free to contact us at:
                    <a
                        href="mailto:hello@devino.ca"
                        className="text-caramel underline"
                    >
                        hello@devino.ca
                    </a>
                </p>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
