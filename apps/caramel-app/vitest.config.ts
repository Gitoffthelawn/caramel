import tsconfigPaths from 'vite-tsconfig-paths'
import { configDefaults, defineConfig } from 'vitest/config'

// Unit baseline (F-004). Playwright owns `e2e/**` (playwright.config.ts
// testDir: './e2e') — excluded here so vitest never tries to collect it.
// `**/*.eval.*` is reserved for F-012's separate eval harness.
export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        environment: 'node',
        include: ['tests/unit/**/*.test.ts'],
        exclude: [...configDefaults.exclude, 'e2e/**', '**/*.eval.*'],
    },
})
