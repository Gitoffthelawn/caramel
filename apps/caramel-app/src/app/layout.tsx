import { BASE_URL } from '@/lib/env.client'
import '@/styles/globals.css'
import type { Metadata, Viewport } from 'next'
import { ReactNode } from 'react'
import Providers from './providers'

export const metadata: Metadata = {
    title: 'Caramel | The Trusted Alternative To Honey For Finding Coupons',
    description:
        "The open-source & privacy-first extension that automatically finds and applies the best coupon codes at checkout without selling your data or hijacking creators' commissions.",
    metadataBase: new URL(BASE_URL),
    openGraph: {
        type: 'website',
        title: 'Caramel | The Trusted Alternative To Honey For Finding Coupons',
        description:
            "The open-source & privacy-first extension that automatically finds and applies the best coupon codes at checkout without selling your data or hijacking creators' commissions.",
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

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
