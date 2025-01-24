
import "@/styles/globals.css";
import RootLayout from "@/layouts/layout/layout";

function MyApp({ Component, pageProps }) {
    return (
        <RootLayout>
            <Component {...pageProps} />
        </RootLayout>
    );
}

export default MyApp;
