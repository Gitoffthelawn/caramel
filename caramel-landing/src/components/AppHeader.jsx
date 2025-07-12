import Head from 'next/head'

const AppHeader = ({
    ogTitle = 'Caramel | The Trusted Alternative To Honey For Finding Coupons',
    ogDescription = 'The open-source & privacy-first extension that automatically finds and applies the best coupon codes at checkout without selling your data or hijacking creators’ commissions.',
    ogUrl = 'https://grabcaramel.com/',
}) => {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://grabcaramel.com'
  const banner = `${base}/caramel_banner.png`
  // TODO: square is unused for now but should be used for card that has small image
  // I couldn't make it work.
  const square = `${base}/square_caramel_logo.png`
  const icon = `${base}/caramel.svg`


  return (
    <Head>
      {/* Favicons */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="shortcut icon" href={icon} />
      <link rel="apple-touch-icon" sizes="180x180" href="/app/ios/180.png" />

      {/* Canonical and basic SEO */}
      <title>{ogTitle}</title>
      <meta name="description" content={ogDescription} />
      <link rel="canonical" href={ogUrl} />

      {/* Open Graph */}
      <meta property="og:type"        content="website" />
      <meta property="og:url"         content={ogUrl} />
      <meta property="og:logo" content={square} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:title"       content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:image"       content={banner} />
      <meta property="og:image:width"  content="1200" />
      <meta property="og:image:height" content="630" />


      {/* Twitter */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:site"        content="@CaramelOfficial" />
      <meta name="twitter:url"         content={ogUrl} />
      <meta name="twitter:title"       content={ogTitle} />
      <meta name="twitter:description" content={ogDescription} />
      <meta name="twitter:image"       content={banner} />

      {/* PWA / theme */}
      <link rel="manifest" href="/manifest.json" />
      <meta name="application-name"               content="Caramel" />
      <meta name="apple-mobile-web-app-capable"   content="yes" />
    </Head>
  )
}

export default AppHeader
