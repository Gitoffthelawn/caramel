import Footer from '@/layouts/Footer/Footer'
import Header from '@/layouts/Header/Header'
import { ThemeContext } from '@/lib/contexts'
import { useContext, useRef } from 'react'

interface LayoutProps {
    children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
    const { isDarkMode } = useContext(ThemeContext)
    const ref = useRef<HTMLDivElement>(null)
    return (
        // <html> is the AUTHORITATIVE theme marker now (stamped pre-paint by
        // the script in app/layout.tsx, kept in sync by switchTheme): it is what
        // satisfies every `dark:` variant below and what paints the page
        // background via globals.css. This wrapper's `dark`/`light` is a
        // secondary scope only — the server can't know the stored theme, so it
        // always emits `light`, and React leaves that value on the DOM node
        // until the first re-render (hence suppressHydrationWarning). Don't
        // reintroduce a background here: it would repaint the whole viewport
        // light until hydration, which is the flash this all exists to kill.
        <div
            ref={ref}
            suppressHydrationWarning
            className={`flex min-h-screen flex-col overflow-x-hidden scroll-smooth ${
                isDarkMode ? 'dark' : 'light'
            } font-Roboto`}
        >
            <Header scrollRef={ref} />
            <div className="flex-1">{children}</div>
            <Footer />
        </div>
    )
}
