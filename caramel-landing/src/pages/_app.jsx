
import "@/styles/globals.css";
import React, {useEffect, useState} from "react";
import dynamic from "next/dynamic";
import {Loader} from "@react-three/drei";
import { ThemeContext } from '@/lib/contexts'

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

function MyApp({ Component, pageProps }) {
    const [isDarkMode, setDarkMode] = useState(false)
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
                <Layout>
                    <Component {...pageProps} />
                </Layout>
        </ThemeContext.Provider>
    );
}

export default MyApp;
