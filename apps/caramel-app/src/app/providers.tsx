'use client'
import Layout from '@/layouts/Layout/Layout'
import { ThemeContext } from '@/lib/contexts'
import * as gtag from '@/lib/gtag'
import Hotjar from '@hotjar/browser'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Toaster } from 'sonner'

// Layout is imported STATICALLY on purpose. It used to be a
// `next/dynamic(..., { ssr: false })` wrapper, which meant crawlers received an
// empty shell for every page — the site's worst SEO defect. The only thing
// ssr:false actually bought was hiding the theme flash: with the tree client-
// only, the neutral loading spinner covered the window between first paint and
// the localStorage read below. That is now solved properly by the
// pre-hydration script in app/layout.tsx, so the tree can server-render.

export default function Providers({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    // Read back what the pre-hydration script (app/layout.tsx) already decided,
    // so the first CLIENT render matches the painted DOM. The server has no
    // access to it and renders the light default, hence the
    // suppressHydrationWarning on the elements carrying the theme class.
    const [isDarkMode, setDarkMode] = useState(
        () =>
            typeof document !== 'undefined' &&
            document.documentElement.classList.contains('dark'),
    )
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
    }, [])

    const switchTheme = () => {
        const next = !isDarkMode
        setDarkMode(next)
        localStorage.setItem('theme', next ? 'dark' : 'light')
        // Keep <html> authoritative: globals.css paints the page background off
        // `html.dark`, and the next full load reads it back before hydration.
        const classes = document.documentElement.classList
        classes.toggle('dark', next)
        classes.toggle('light', !next)
    }

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
