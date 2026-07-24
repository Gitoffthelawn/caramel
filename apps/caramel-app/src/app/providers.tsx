'use client'
import { ThemeContext } from '@/lib/contexts'
import * as gtag from '@/lib/gtag'
import Hotjar from '@hotjar/browser'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Toaster } from 'sonner'

const Layout = dynamic(() => import('@/layouts/Layout/Layout'), {
    ssr: false,
    loading: () => (
        // Full-viewport, truly centered loader (min-h-screen — the old
        // h-full collapsed to 0 with no sized parent, pinning the spinner to
        // the top). Dependency-free CSS: this fallback wraps EVERY page, so it
        // must not pull `three` into first-load JS (drei's <Loader> did — see
        // tests/unit/three-lazy-boundary.test.ts).
        <div className="flex min-h-screen w-full flex-col items-center justify-center gap-5">
            <div className="relative h-14 w-14" aria-hidden="true">
                <div className="absolute inset-0 rounded-full border-[3px] border-caramel/15" />
                <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-caramel" />
            </div>
            <p className="bg-gradient-to-r from-caramel to-orange-600 bg-clip-text text-center text-lg font-semibold tracking-tight text-transparent">
                Loading…
            </p>
        </div>
    ),
})

export default function Providers({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const [isDarkMode, setDarkMode] = useState(false)
    const pagesLayoutless = useMemo(() => ['/login', '/signup', '/verify'], [])

    useEffect(() => {
        const handleRouteChange = (url: string) => gtag.pageView(url)
        handleRouteChange(pathname || '/')
    }, [pathname])

    useEffect(() => {
        if (process.env.NODE_ENV === 'production') {
            try {
                Hotjar.init(6369129, 6)
            } catch {}
        }
        const theme = localStorage.getItem('theme')
        setDarkMode(theme === 'dark')
    }, [])

    const switchTheme = () =>
        setDarkMode(prev => {
            localStorage.setItem('theme', prev ? 'light' : 'dark')
            return !prev
        })

    const content = pagesLayoutless.some(p => (pathname || '').includes(p)) ? (
        children
    ) : (
        <Layout>{children}</Layout>
    )

    return (
        <>
            <ThemeContext.Provider value={{ isDarkMode, switchTheme }}>
                {content}
            </ThemeContext.Provider>
            <Toaster
                position="bottom-right"
                toastOptions={{
                    style: {
                        background: '#ea6925',
                        color: '#ffffff',
                        border: 'none',
                    },
                }}
            />
            {/* GA */}
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
