import { ThemeContext } from '@/lib/contexts'
import * as gtag from '@/lib/gtag'
import '@/styles/globals.css'
import Hotjar from '@hotjar/browser'
import { Loader } from '@react-three/drei'
import { SessionProvider } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import Script from 'next/script'
import { useEffect, useState } from 'react'

const siteId = 6369129
const hotjarVersion = 6

const Layout = dynamic(() => import('@/layouts/Layout/Layout'), {
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4">
            <div className="mx-auto h-fit">
                <Loader />
            </div>
            <div>
                <p className="bg-gradient-rainbow-light font-SpaceGrotesk dark:bg-gradient-rainbow bg-clip-text text-center text-2xl font-bold text-transparent">
                    Loading...
                </p>
            </div>
        </div>
    ),
})
const pagesLayoutless = ['/login', '/signup']
function MyApp({ Component, pageProps: { session, ...pageProps } }) {
    const [isDarkMode, setDarkMode] = useState(false)
    const { pathname, events } = useRouter()
    useEffect(() => {
        const handleRouteChange = url => {
            gtag.pageView(url)
        }
        events.on('routeChangeComplete', handleRouteChange)
        return () => {
            events.off('routeChangeComplete', handleRouteChange)
        }
    }, [events])
    const switchTheme = () => {
        setDarkMode(prevState => {
            localStorage.setItem('theme', prevState ? 'light' : 'dark')
            return !prevState
        })
    }
    useEffect(() => {
        if (process.env.NODE_ENV === 'production') {
            Hotjar.init(siteId, hotjarVersion)
        }
        setDarkMode(localStorage.getItem('theme') === 'dark')
        setDarkMode(
            !!(
                localStorage.getItem('theme') &&
                localStorage.getItem('theme') === 'dark'
            ),
        )
    }, [])
    return (
        <>
            <AppHeader />
            <ThemeContext.Provider value={{ isDarkMode, switchTheme }}>
                <SessionProvider session={session}>
                    {pagesLayoutless &&
                    pagesLayoutless.some(page => pathname.includes(page)) ? (
                        <Component {...pageProps} />
                    ) : (
                        <Layout>
                            <Component {...pageProps} />
                        </Layout>
                    )}
                </SessionProvider>
            </ThemeContext.Provider>
            <Script
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_TRACKING_ID}`}
            />
            <Script id="gtag-init" strategy="afterInteractive">
                {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());

                    gtag('config', '${gtag.GA_TRACKING_ID}');
                `}
            </Script>
        </>
    )
}

export default MyApp
