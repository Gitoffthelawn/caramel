
import Head from 'next/head'
import {capitalizeFirst} from "@/lib/capitalizeFirst";

const AppHeader = ({
                               description,
                               ogTitle,
                               ogUrl,
                               metaDescription,
                           }) => {
    const title = `Caramel | ${capitalizeFirst(description || 'Best coupons extension for Chrome and Safari')}`
    const fullOgUrl = ogUrl ? ogUrl : 'https://dev.grabcaramel.com/'
    const fullOgImage = `${fullOgUrl}/caramel_banner.png`
    return (
        <>
            <Head>
                <link rel="icon" href="/favicon.ico"/>
                <link rel="shortcut icon" href="/caramel.svg"/>
                <title>{title}</title>
                <meta
                    name="description"
                    content={description || 'YouTube & Spotify AI Summarizer'}
                />
                <meta property="og:type" content="website"/>
                <meta property="og:title" content={ogTitle ? ogTitle : title}/>
                <meta property="og:description" content={description}/>
                <meta property="og:image" content={fullOgImage}/>
                <meta property="og:url" content={fullOgUrl}/>
                <meta property="og:site_name" content="Caramel"/>
                <meta property="twitter:card" content="summary_large_image"/>
                <meta property="twitter:url" content={fullOgUrl}/>
                <meta property="twitter:title" content={title}/>
                <meta property="twitter:description" content={description}/>
                <meta property="twitter:image" content={fullOgImage}/>
                <meta property="twitter:creator" content="@CaramelOfficial"/>
                <link rel="canonical" href={fullOgUrl}/>
                <meta
                    property="og:title"
                    name="description"
                    content={title}
                    key="title"
                />

                <meta
                    name="description"
                    content={
                        metaDescription
                            ? metaDescription
                            : 'Caramel | Best coupons extension for Chrome and Safari'
                    }
                />

                <meta name="application-name" content="Caramel"/>
                <meta name="apple-mobile-web-app-capable" content="yes"/>
                <meta
                    name="apple-mobile-web-app-status-bar-style"
                    content="default"
                />
                <meta name="apple-mobile-web-app-title" content="Caramel"/>
                <meta
                    name="description"
                    content="Best coupons extension for Chrome and Safari"
                />
                <meta name="format-detection" content="telephone=no"/>
                <meta name="mobile-web-app-capable" content="yes"/>
                <meta
                    name="msapplication-config"
                    content="/icons/browserconfig.xml"
                />
                <meta name="msapplication-TileColor" content="#2B5797"/>
                <meta name="msapplication-tap-highlight" content="no"/>
                <meta name="theme-color" content="#000000"/>
                <link
                    rel="apple-touch-icon"
                    href="/app/ios/180.png"
                />
                <link
                    rel="apple-touch-icon"
                    sizes="152x152"
                    href="/app/ios/152.png"
                />
                <link
                    rel="apple-touch-icon"
                    sizes="180x180"
                    href="/app/ios/180.png"
                />
                <link
                    rel="apple-touch-icon"
                    sizes="167x167"
                    href="/app/ios/167.png"
                />

                <link
                    rel="icon"
                    type="image/png"
                    sizes="32x32"
                    href="/app/ios/32.png"
                />
                <link
                    rel="icon"
                    type="image/png"
                    sizes="16x16"
                    href="/app/ios/16.png"
                />
                <link rel="manifest" href="/manifest.json"/>
                <meta name="twitter:card" content="summary"/>
                <meta
                    name="twitter:url"
                    content={ogUrl ? ogUrl : 'https://dev.grabcaramel.com/'}
                />
                <meta name="twitter:title" content="Caramel"/>
                <meta
                    name="twitter:description"
                    content="Best coupons extension for Chrome and Safari"
                />
                <meta name="twitter:image" content="/og.svg"/>
                <meta name="twitter:creator" content="@CaramelOfficial"/>
                <meta property="og:type" content="website"/>
                <meta
                    property="og:title"
                    content={ogTitle ? ogTitle : 'Caramel'}
                />
                <meta
                    property="og:description"
                    content="Best coupons extension for Chrome and Safari"
                />
                <meta property="og:site_name" content="Caramel"/>
                <meta
                    property="og:url"
                    content={ogUrl ? ogUrl : 'https://dev.grabcaramel.com/'}
                />
                <meta property="og:image" content="/caramel.svg"/>
            </Head>
        </>
    )
}

export default AppHeader
