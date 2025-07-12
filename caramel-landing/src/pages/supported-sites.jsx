import AppHeader from "@/components/AppHeader";
import SearchSection from "@/components/supported-site/search-section";


export default function SupportedSitesPage() {
    return (
        <>
                    <AppHeader 
            ogTitle="Caramel | Supported Stores" 
            ogDescription="Explore the stores supported by Caramel and start saving with our coupon extension."
            ogUrl="https://grabcaramel.com/supported-sites"
        />
        <main className="min-h-screen pt-32 px-6 flex flex-col items-center">

            <SearchSection />
        </main>
        </>
    );
}
