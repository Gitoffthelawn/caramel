
import "@/styles/globals.css";
import React, {useEffect, useState} from "react";
import dynamic from "next/dynamic";
import {Loader} from "@react-three/drei";
import { ThemeContext } from '@/lib/contexts'
import AppHeader from "@/components/AppHeader";
import {useRouter} from "next/router";
import {SessionProvider} from "next-auth/react";

const Layout = dynamic(() => import('@/layouts/Layout/Layout'), {
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4">
            <div className="mx-auto h-fit">
                <Loader />
            </div>
            <div>
                <p className="bg-gradient-rainbow-light bg-clip-text text-center font-SpaceGrotesk text-2xl font-bold text-transparent dark:bg-gradient-rainbow">
                    Loading...
                </p>
            </div>
        </div>
    ),
})
const pagesLayoutless = [
    '/login',
    '/signup',
]
function MyApp({ Component, pageProps: { session, ...pageProps } }) {
    const [isDarkMode, setDarkMode] = useState(false)
    const { pathname } = useRouter()
    const switchTheme = () => {
        setDarkMode(prevState => {
            localStorage.setItem('theme', prevState ? 'light' : 'dark')
            return !prevState
        })
    }
    useEffect(() => {
        setDarkMode(
            !!(
                localStorage.getItem('theme') &&
                localStorage.getItem('theme') === 'dark'
            ),
        )
    }, [])
    return (
        <ThemeContext.Provider value={{ isDarkMode, switchTheme }}>
            <SessionProvider session={session}>
                <AppHeader
                    description="Best coupons extension for Chrome and Safari"
                    ogTitle="Caramel"
                    ogUrl="https://dev.grabcaramel.com/"
                />
                {pagesLayoutless &&
                pagesLayoutless.some(page =>
                    pathname.includes(page),
                ) ? (
                    <Component {...pageProps} />
                ) : (
                    <Layout>
                        <Component {...pageProps} />
                    </Layout>
                )}
            </SessionProvider>
        </ThemeContext.Provider>
    );
}

export default MyApp;
