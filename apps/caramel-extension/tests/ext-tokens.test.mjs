import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Phase 0 of the extension UI modernization: assets/tokens.css is the single
// home for the brand palette; styles.css must consume it via var(--cm-*).
// SCOPE: styles.css + index.html only for now — caramel-content.css is
// injected into HOST pages where tokens.css's :root vars don't exist, so it
// keeps literal values until the content UI moves into a Shadow DOM.
// TODO: Phase 3 extends this test to cover caramel-content.css.

const extensionRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = relPath => readFileSync(join(extensionRoot, relPath), 'utf8')

/** Strip url(...) values (base64 data-URI cursors etc.) so encoded assets
 * can't mask — or falsely trip — the raw-hex scan. */
const stripUrls = css => css.replace(/url\([^)]*\)/gi, 'url(STRIPPED)')

describe('extension design tokens (Phase 0)', () => {
    it('styles.css contains no raw brand hexes (#ea6925 / #d65d1f) outside url(...) data-URIs', () => {
        const css = stripUrls(read('assets/styles.css'))
        expect(css).not.toMatch(/#ea6925/i)
        expect(css).not.toMatch(/#d65d1f/i)
    })

    it('tokens.css defines the brand tokens (hexes legitimately live there)', () => {
        const tokens = read('assets/tokens.css')
        expect(tokens).toMatch(/--cm-brand:\s*#ea6925/i)
        expect(tokens).toMatch(/--cm-brand-strong:\s*#d65d1f/i)
    })

    it('index.html links tokens.css BEFORE styles.css (vars must exist when styles.css resolves)', () => {
        const html = read('index.html')
        const tokensIdx = html.indexOf('assets/tokens.css')
        const stylesIdx = html.indexOf('assets/styles.css')
        expect(tokensIdx).toBeGreaterThan(-1)
        expect(stylesIdx).toBeGreaterThan(-1)
        expect(tokensIdx).toBeLessThan(stylesIdx)
    })
})
