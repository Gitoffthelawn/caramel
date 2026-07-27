import { BASE_URL } from '@/lib/env.client'
import type { Metadata } from 'next'
import SourcesPageClient from './SourcesPageClient'

const title = 'Where Caramel Coupon Codes Come From | Sources'
const description =
    'See every source Caramel pulls coupon codes from, how many codes each one contributes, and its success rate — or request a new source.'
const base = BASE_URL
const canonicalUrl = `${base}/sources`
const banner = `${base}/caramel_banner.png`

export const metadata: Metadata = {
    title,
    description,
    alternates: {
        canonical: '/sources',
    },
    openGraph: {
        type: 'website',
        url: canonicalUrl,
        title,
        description,
        locale: 'en_US',
        siteName: 'Caramel',
        images: [
            {
                url: banner,
                width: 1200,
                height: 630,
                alt: "Caramel's coupon sources",
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        site: '@CaramelOfficial',
        title,
        description,
        images: [banner],
    },
}

export default function SourcesPage() {
    return <SourcesPageClient />
}
