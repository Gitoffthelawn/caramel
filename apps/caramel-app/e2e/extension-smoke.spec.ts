import { expect, test } from '@playwright/test'
import { existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'

const extensionDir = resolve(__dirname, '../../caramel-extension')

// Chrome/Firefox extension match-pattern semantics — <scheme>://<host><path>
// — enough to check that a supported domain would actually be injected into.
// Ref: developer.chrome.com/docs/extensions/develop/concepts/match-patterns
// Replaces an earlier substring check that could never pass: the manifest
// deliberately ships one broad 'https://*/*' host pattern, and
// 'https://*/*'.includes('amazon.com') is always false (NF-03).
function matchPatternMatchesUrl(pattern: string, url: string): boolean {
    if (pattern === '<all_urls>') return true

    const patternParts = /^([^:]+):\/\/([^/]*)(\/.*)$/.exec(pattern)
    const urlParts = /^([^:]+):\/\/([^/]*)(\/.*)$/.exec(url)
    if (!patternParts || !urlParts) return false

    const [, patternScheme, patternHost, patternPath] = patternParts
    const [, urlScheme, urlHost, urlPath] = urlParts

    // scheme: '*' matches only http and https; otherwise it must be exact.
    if (patternScheme === '*') {
        if (urlScheme !== 'http' && urlScheme !== 'https') return false
    } else if (patternScheme !== urlScheme) {
        return false
    }

    // host: '*' matches any host; '*.suffix' matches suffix itself and any of
    // its subdomains (NOT a sibling like notsuffix); otherwise exact match.
    const host = urlHost.toLowerCase()
    if (patternHost !== '*') {
        if (patternHost.startsWith('*.')) {
            const suffix = patternHost.slice(2).toLowerCase()
            if (host !== suffix && !host.endsWith(`.${suffix}`)) return false
        } else if (host !== patternHost.toLowerCase()) {
            return false
        }
    }

    // path: '*' is the only wildcard; every other char is matched literally.
    const pathPattern = patternPath
        .split('*')
        .map(segment => segment.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*')
    return new RegExp(`^${pathPattern}$`).test(urlPath)
}

test.describe('Extension — Manifest Validation', () => {
    let manifest: Record<string, unknown>

    test.beforeAll(() => {
        const raw = readFileSync(join(extensionDir, 'manifest.json'), 'utf-8')
        manifest = JSON.parse(raw)
    })

    test('manifest.json is valid and has required fields', () => {
        expect(manifest.manifest_version).toBe(3)
        expect(manifest.name).toBeTruthy()
        expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/)
        expect(manifest.description).toBeTruthy()
    })

    test('manifest declares required permissions', () => {
        const permissions = manifest.permissions as string[]
        expect(permissions).toContain('tabs')
        expect(permissions).toContain('activeTab')
        expect(permissions).toContain('storage')
    })

    test('manifest has background service worker', () => {
        const background = manifest.background as Record<string, string>
        expect(background?.service_worker).toBe('background.js')
        expect(existsSync(join(extensionDir, background.service_worker))).toBe(
            true,
        )
    })

    test('manifest has popup action', () => {
        const action = manifest.action as Record<string, unknown>
        expect(action?.default_popup).toBe('index.html')
        expect(existsSync(join(extensionDir, 'index.html'))).toBe(true)
    })

    test('content scripts reference existing files', () => {
        const contentScripts = manifest.content_scripts as Array<{
            js: string[]
            matches: string[]
        }>
        expect(contentScripts).toBeDefined()
        expect(contentScripts.length).toBeGreaterThan(0)

        for (const script of contentScripts) {
            expect(script.matches.length).toBeGreaterThan(0)
            for (const jsFile of script.js) {
                expect(existsSync(join(extensionDir, jsFile))).toBe(true)
            }
        }
    })

    test('all icons referenced in manifest exist', () => {
        const icons = manifest.icons as Record<string, string>
        expect(icons).toBeDefined()

        for (const [size, path] of Object.entries(icons)) {
            expect(Number(size)).toBeGreaterThan(0)
            // Icon paths start with / in manifest
            const iconPath = join(extensionDir, path.replace(/^\//, ''))
            expect(existsSync(iconPath)).toBe(true)
        }
    })
})

test.describe('Extension — Supported Sites Validation', () => {
    let supported: Array<Record<string, string>>

    test.beforeAll(() => {
        const raw = readFileSync(join(extensionDir, 'supported.json'), 'utf-8')
        const data = JSON.parse(raw)
        supported = data.supported
    })

    test('supported.json has entries', () => {
        expect(supported).toBeDefined()
        expect(supported.length).toBeGreaterThan(0)
    })

    test('each supported site has required selectors', () => {
        for (const site of supported) {
            expect(site.domain).toBeTruthy()
            expect(site.couponInput).toBeTruthy()
            expect(site.couponSubmit).toBeTruthy()
            expect(site.priceContainer).toBeTruthy()
        }
    })

    test('supported sites include expected domains', () => {
        const domains = supported.map(s => s.domain)
        expect(domains).toContain('amazon.com')
        expect(domains).toContain('ebay.com')
    })

    test('content script matches align with supported domains', () => {
        const manifest = JSON.parse(
            readFileSync(join(extensionDir, 'manifest.json'), 'utf-8'),
        )
        const contentScripts = manifest.content_scripts as Array<{
            matches: string[]
        }>
        const matchPatterns = contentScripts.flatMap(cs => cs.matches)

        for (const site of supported) {
            // A domain is covered when at least one content-script match
            // pattern would actually inject into it — checked for both the
            // bare domain and its typical www. subdomain form.
            const injectionTargets = [
                `https://${site.domain}/`,
                `https://www.${site.domain}/`,
            ]
            for (const target of injectionTargets) {
                const covered = matchPatterns.some(pattern =>
                    matchPatternMatchesUrl(pattern, target),
                )
                expect(
                    covered,
                    `no content_scripts match pattern injects into ${target}`,
                ).toBe(true)
            }
        }

        // Guard: the evaluator must discriminate, not rubber-stamp — a helper
        // that returned true for everything would make the loop above vacuous
        // (NF-03 was precisely a check that could never fail correctly).
        const httpRejectedByHttpsPattern = matchPatternMatchesUrl(
            'https://*/*',
            'http://amazon.com/',
        )
        const siblingDomainRejected = matchPatternMatchesUrl(
            'https://*.amazon.com/*',
            'https://notamazon.com/',
        )
        expect(httpRejectedByHttpsPattern).toBe(false)
        expect(siblingDomainRejected).toBe(false)
    })
})

test.describe('Extension — File Integrity', () => {
    const requiredFiles = [
        'manifest.json',
        'index.html',
        'popup.js',
        'background.js',
        'inject.js',
        // F-008 split shared-utils.js into the 6 files below (load order matters
        // in the manifests; alphabetical here — this test only checks existence).
        'caramel-base.js',
        'dom-utils.js',
        'store-detect.js',
        'coupon-apply.js',
        'coupon-fetch.js',
        'coupon-runner.js',
        // F-006 codegen output, loaded before the split files.
        'coupon-constants.generated.js',
        'UI-helpers.js',
        'supported.json',
        'assets/styles.css',
    ]

    for (const file of requiredFiles) {
        test(`${file} exists`, () => {
            expect(existsSync(join(extensionDir, file))).toBe(true)
        })
    }

    test('Firefox manifest exists', () => {
        expect(existsSync(join(extensionDir, 'manifest-firefox.json'))).toBe(
            true,
        )
    })

    test('Firefox manifest is valid JSON', () => {
        const raw = readFileSync(
            join(extensionDir, 'manifest-firefox.json'),
            'utf-8',
        )
        expect(() => JSON.parse(raw)).not.toThrow()
    })
})
