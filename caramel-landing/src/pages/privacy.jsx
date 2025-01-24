
import Image from 'next/image'
import { Fragment, useState } from 'react'
import PrivacyPolicy from "@/components/PrivacyPolicy";

const Privacy = () => {
    const [activeIndex, setActiveIndex] = useState(0)

    return (
        <div className="flex justify-center bg-gray-50 h-fit overflow-y-auto">
            <div className="max-w-6xl mt-[5rem]">
                <div className="flex items-center justify-between p-8">
                    <div>
                        <h1 className="text-5xl font-normal text-caramel md:text-2xl sm:text-xl">
                            Caramel Privacy Policy
                        </h1>
                        <p className="sm:text-md text-center text-3xl text-caramel md:text-xl">
                            We value your privacy
                        </p>
                    </div>
                </div>
                <div className="p-8 ">
                    <PrivacyPolicy />
                </div>
            </div>
        </div>
    )
}

export default Privacy
