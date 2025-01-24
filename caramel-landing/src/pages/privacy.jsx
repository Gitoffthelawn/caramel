
import PrivacyPolicy from "@/components/PrivacyPolicy";
import AppHeader from "@/AppHeader";

const Privacy = () => {

    return (
        <div className="flex justify-center dark:bg-darkBg h-fit overflow-y-auto">
            <AppHeader description={"Caramel Privacy Policy"} ogTitle={"Privacy page"}/>
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
