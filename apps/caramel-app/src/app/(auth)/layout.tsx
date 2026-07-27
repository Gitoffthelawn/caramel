'use client'

import ThemeToggle from '@/components/ThemeToggle'
import { ThemeContext } from '@/lib/contexts'
import { useContext } from 'react'

// Auth routes are deliberately layoutless (no Header/Footer — see
// providers.tsx `pagesLayoutless`), so this shell owns what Layout.tsx owns
// everywhere else: the `dark` class scope, the page background, and a theme
// toggle. Pages render only their card.
export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { isDarkMode } = useContext(ThemeContext)

    return (
        // suppressHydrationWarning: the server has no access to the stored
        // theme and always renders `light` (see app/layout.tsx).
        <div suppressHydrationWarning className={isDarkMode ? 'dark' : 'light'}>
            <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 px-4 py-12 dark:bg-darkBg">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-caramel/10 blur-3xl dark:bg-caramel/15"
                />
                <ThemeToggle className="absolute right-6 top-6" />
                {children}
            </div>
        </div>
    )
}
