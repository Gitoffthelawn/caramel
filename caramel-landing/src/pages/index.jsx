
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import OpenSourceSection from "@/components/OpenSourceSection";
import React from "react";
import Doodles from "@/components/Doodles";
import SupportedSection from "@/components/SupportedSection";
import AppHeader from "@/components/AppHeader";

export default function Index() {
    return (
        <main className={"w-[100%] relative overflow-x-clip -mt-[6.7rem]"}>
            <AppHeader/>
            <Doodles />
            <HeroSection/>
            <FeaturesSection/>
            <SupportedSection/>
            <OpenSourceSection/>
        </main>
    );
}
