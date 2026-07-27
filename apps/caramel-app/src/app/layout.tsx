import { BASE_URL } from '@/lib/env.client'
import '@/styles/globals.css'
import type { Metadata, Viewport } from 'next'
import { ReactNode } from 'react'
import Providers from './providers'

// Kept at 157 chars so Google/social cards never truncate it mid-claim; the
// openGraph copy below is the same string on purpose.
const description =
    "Open-source, privacy-first coupon extension that finds and applies the best codes at checkout — without selling your data or hijacking creators' commissions."

export const metadata: Metadata = {
    title: 'Caramel | The Trusted Alternative To Honey For Finding Coupons',
    description,
    metadataBase: new URL(BASE_URL),
    openGraph: {
        type: 'website',
        title: 'Caramel | The Trusted Alternative To Honey For Finding Coupons',
        description,
        url: '/',
        images: ['/caramel_banner.png'],
    },
    icons: {
        icon: '/favicon.ico',
        apple: '/app/ios/180.png',
    },
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        title: 'Caramel',
        statusBarStyle: 'default',
    },
}

export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#ea6925' },
        { media: '(prefers-color-scheme: dark)', color: '#171210' },
    ],
}

// Pre-hydration theme script. The app is server-rendered (providers.tsx no
// longer hides the whole tree behind `next/dynamic ssr:false`), so the server
// has no way to know a visitor's stored theme — this runs before first paint
// and stamps it on <html>, which is what `html.dark` in globals.css and every
// Tailwind `dark:` variant key off. ThemeContext reads the same class back on
// its first client render, so DOM and React state can never disagree.
const THEME_INIT_SCRIPT = `(function(){var d=false;try{d=localStorage.getItem('theme')==='dark'}catch(e){/* storage blocked (private mode) - fall back to light */}var c=document.documentElement.classList;c.add(d?'dark':'light');c.remove(d?'light':'dark')})()`

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        // suppressHydrationWarning: the script above mutates <html>'s class
        // list before React hydrates.
        <html lang="en" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
                />
            </head>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
