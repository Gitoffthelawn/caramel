import { createContext } from 'react'

interface ThemeContextType {
    isDarkMode: boolean
    switchTheme: () => void
}

export const ThemeContext = createContext<ThemeContextType>({
    isDarkMode: true,
    switchTheme: () => {},
})
