/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    screens: {
      '3xl': { max: '1600px' },
      // => @media (max-width: 1535px) { ... }

      '2xl': { max: '1535px' },
      // => @media (max-width: 1535px) { ... }

      xl: { max: '1279px' },
      // => @media (max-width: 1279px) { ... }

      lg: { max: '1023px' },
      // => @media (max-width: 1023px) { ... }

      md: { max: '767px' },
      // => @media (max-width: 767px) { ... }

      sm: { max: '639px' },
      // => @media (max-width: 639px) { ... }
      xs: { max: '475px' },
      // => @media (max-width: 475px) { ... }
      tall: { raw: '(max-height: 800px)' },
    },
    extend: {
      colors: {
        caramel: "#ea6925",
        caramelLight: "#da7f52",
        darkBg: "#191A1C",
        darkerBg: "#101010"

      },
    },
  },
  plugins: [],
}
