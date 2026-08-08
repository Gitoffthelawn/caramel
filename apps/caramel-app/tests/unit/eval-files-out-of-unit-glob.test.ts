import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import unitConfig from '../../vitest.config'

// Eval-glob isolation gate (DESIGN.md §5, CLAUDE.md "new .eval.ts stays out
// of the unit glob") — "rules become checks". `.eval.ts` suites make LIVE
// OpenRouter calls that cost real money (evals/cartClassifier.eval.ts), so
// they must NEVER be collected by `pnpm test` (the unit runner). This gate
// reads the unit runner's own include/exclude and proves eval files are
// uncollectable TWO independent ways, so a regression in either is caught:
//   (1) every `include` glob is rooted at tests/unit/** — evals/ live
//       elsewhere, so they can't match include at all; and
//   (2) `exclude` carries an explicit **/*.eval.* backstop — so even an eval
//       file dropped INTO tests/unit stays uncollectable.
// It also asserts a live .eval.ts actually exists, so the guard can't rot
// into vacuously passing over an empty evals/ dir.

const REPO_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../..',
)
const EVALS_DIR = path.join(REPO_ROOT, 'apps/caramel-app/evals')

// The static object exported by vitest.config.ts. Read through `unknown` (no
// `any`); if the config is ever restructured away from this shape, include/
// exclude read empty and the assertions below fail loudly rather than
// silently passing.
interface ResolvedUnitConfig {
    test?: { include?: string[]; exclude?: string[] }
}

function unitTestGlobs(): { include: string[]; exclude: string[] } {
    const cfg = unitConfig as unknown as ResolvedUnitConfig
    return {
        include: cfg.test?.include ?? [],
        exclude: cfg.test?.exclude ?? [],
    }
}

function includesAreUnitScoped(include: string[]): boolean {
    return include.length > 0 && include.every(g => g.startsWith('tests/unit/'))
}

function excludesEvalFiles(exclude: string[]): boolean {
    return exclude.includes('**/*.eval.*')
}

function findEvalFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return []
    const found: string[] = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            found.push(...findEvalFiles(full))
        } else if (entry.name.endsWith('.eval.ts')) {
            found.push(full)
        }
    }
    return found
}

describe('eval-files-out-of-unit-glob (DESIGN §5)', () => {
    it('the unit runner cannot collect any *.eval.* file', () => {
        const { include, exclude } = unitTestGlobs()
        expect(includesAreUnitScoped(include)).toBe(true)
        expect(excludesEvalFiles(exclude)).toBe(true)
    })

    it('at least one live .eval.ts exists under evals/ (guards against a vacuous gate)', () => {
        expect(findEvalFiles(EVALS_DIR).length).toBeGreaterThan(0)
    })

    it('the checkers catch a config that would leak eval files (red-proof)', () => {
        // include not unit-scoped → a broad tests/** glob sweeps in evals/.
        expect(includesAreUnitScoped(['tests/**/*.test.ts'])).toBe(false)
        expect(includesAreUnitScoped(['tests/unit/**/*.test.{ts,tsx}'])).toBe(
            true,
        )
        // exclude missing the eval backstop.
        expect(excludesEvalFiles(['node_modules/**', 'e2e/**'])).toBe(false)
        expect(excludesEvalFiles(['e2e/**', '**/*.eval.*'])).toBe(true)
    })
})
