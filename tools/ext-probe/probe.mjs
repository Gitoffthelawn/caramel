// Loads the REAL unpacked extension and reports what the prompt host actually
// measures on a live store — the only way to catch "it injected, at 0x0".
//
// Playwright's bundled Chromium, own profile per run, closed at the end.
//
// Unlike the scratch script this grew out of, the run ends in a machine
// contract: exactly ONE schema-versioned JSON object on stdout, every word of
// prose on stderr, and an exit code that carries the verdict. A caller can
// therefore branch on the result without parsing English, and CI can pin the
// vocabulary (tools/ext-probe/verdict.mjs is browser-free on purpose).
//
// Usage and the full exit-code table: see ./README.md
import { createHash } from 'node:crypto'
import {
    mkdirSync,
    readdirSync,
    readFileSync,
    rmSync,
    statSync,
    writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import {
    countPromoInputsInPage,
    DEFAULT_PRODUCT_LIMIT,
    MAX_REJECTED_ADDS,
    readCartStateInPage,
    seedShopifyCartInPage,
} from './seed.mjs'
import { buildReport, diffWitnesses, emptyObservation } from './verdict.mjs'

// fileURLToPath, not `new URL(...).pathname.slice(1)`: the slice trick strips
// the leading slash of a Windows drive path and silently produces garbage
// anywhere else, which made the scratch version Windows-only.
const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..', '..')
const DEFAULT_EXT_DIR = join(REPO_ROOT, 'apps', 'caramel-extension')

// The extension's own cache key for the supported-domain list (store-detect.js).
// Cleared before the run so the domain list is always fetched fresh: a verdict
// computed against a cached list is a verdict about yesterday's config.
const STORE_CACHE_KEY = 'caramel_supported_stores'
const TIMINGS_KEY = 'caramel_timings'
const API_LOAD_LINE = 'Loaded supported domains from API'
const PROMPT_HOST_ID = 'caramel-small-prompt'

const note = (...args) => console.error(...args)

// A service worker that restarted (or whose execution context died to a page
// navigation) orphans the original Playwright handle: evaluate() on it can hang
// FOREVER — it neither resolves nor rejects, so .catch() never fires. Two live
// stores proved it (100percentpure: "Execution context was destroyed";
// betseyjohnson: "Service worker restarted" — both froze the probe until an
// external kill). Every storage read therefore takes the freshest worker the
// context knows about and races a hard timeout around the call.
const SW_EVAL_TIMEOUT_MS = 8000
async function swEval(ctx, fallbackSw, pageFunction, arg, label) {
    const sw = ctx.serviceWorkers()[0] || fallbackSw
    if (!sw) return { ok: false, value: null }
    try {
        const value = await Promise.race([
            sw.evaluate(pageFunction, arg),
            new Promise((_, reject) => {
                const t = setTimeout(
                    () =>
                        reject(
                            new Error(
                                `evaluate hung > ${SW_EVAL_TIMEOUT_MS}ms (dead worker handle)`,
                            ),
                        ),
                    SW_EVAL_TIMEOUT_MS,
                )
                if (typeof t.unref === 'function') t.unref()
            }),
        ])
        return { ok: true, value }
    } catch (e) {
        note(`  (could not read ${label}: ${e.message})`)
        return { ok: false, value: null }
    }
}

function parseArgs(argv) {
    const positional = []
    const flags = {}
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i]
        if (a.startsWith('--')) {
            const [name, inline] = a.slice(2).split('=')
            flags[name] = inline !== undefined ? inline : argv[++i]
        } else {
            positional.push(a)
        }
    }
    return { positional, flags }
}

function listFiles(dir, base = dir, out = []) {
    for (const name of readdirSync(dir).sort()) {
        // node_modules and VCS metadata are not part of "which build was
        // measured" and would make the hash depend on install state.
        if (name === 'node_modules' || name === '.git') continue
        const full = join(dir, name)
        if (statSync(full).isDirectory()) listFiles(full, base, out)
        else out.push(relative(base, full).split(sep).join('/'))
    }
    return out
}

/**
 * Identify the build under measurement: resolved path, manifest version, and a
 * content hash over every tracked file. "Which build was that?" is the first
 * question asked of any surprising result, and it should never need a guess.
 */
function identifyBuild(extDir) {
    const files = listFiles(extDir)
    const hash = createHash('sha256')
    for (const rel of files) {
        hash.update(rel)
        hash.update('\0')
        hash.update(readFileSync(join(extDir, rel)))
        hash.update('\n')
    }
    let manifestVersion = null
    let manifestName = null
    try {
        const manifest = JSON.parse(
            readFileSync(join(extDir, 'manifest.json'), 'utf8'),
        )
        manifestVersion = manifest.version ?? null
        manifestName = manifest.name ?? null
    } catch (e) {
        note(`  (no readable manifest.json in ${extDir}: ${e.message})`)
    }
    return {
        extensionPath: extDir,
        manifestName,
        manifestVersion,
        fileCount: files.length,
        contentHash: `sha256:${hash.digest('hex')}`,
    }
}

const SELECTOR_FIELDS = [
    'couponInput',
    'couponSubmit',
    'priceContainer',
    'showInput',
    'dismissButton',
    'successIndicator',
    'errorIndicator',
    'couponRemove',
]

function compareConfig(expected, served) {
    if (!expected || !served) return { matches: null, mismatchedFields: [] }
    const mismatched = SELECTOR_FIELDS.filter(
        f => (expected[f] ?? null) !== (served[f] ?? null),
    )
    return { matches: mismatched.length === 0, mismatchedFields: mismatched }
}

function hostMatches(domain, host) {
    const d = String(domain || '').toLowerCase()
    const h = String(host || '').toLowerCase()
    return h === d || h.endsWith(`.${d}`) || d.endsWith(`.${h}`)
}

async function main() {
    const started = Date.now()
    const { positional, flags } = parseArgs(process.argv.slice(2))
    const [url, widthArg, tagArg] = positional
    if (!url) {
        note(
            'usage: node tools/ext-probe/probe.mjs <url> [width] [tag] [--out report.json]',
        )
        // Still a JSON object on stdout: "the probe was called wrong" must be
        // parseable by the same caller that parses every other outcome, or the
        // one-object contract holds only on the happy path.
        throw new Error('no target url given')
    }
    const width = Number(flags.width || widthArg || 390)
    const tag = flags.tag || tagArg || 'probe'
    const extDir = resolve(process.env.EXT_DIR || flags.ext || DEFAULT_EXT_DIR)
    const waitMs = Number(process.env.PROBE_WAIT_MS || flags.wait || 30000)
    const allLogs = process.env.PROBE_ALL_LOGS === '1'
    const outDir = resolve(flags['out-dir'] || join(REPO_ROOT, '.ext-probe'))
    mkdirSync(outDir, { recursive: true })
    const logFile = join(outDir, `ext-probe-${tag}-${width}.log`)
    const screenshotFile = join(outDir, `ext-probe-${tag}-${width}.png`)

    let expectedConfig = null
    if (flags['expect-config'])
        expectedConfig = JSON.parse(
            readFileSync(resolve(flags['expect-config']), 'utf8'),
        )

    const build = identifyBuild(extDir)
    const target = {
        url,
        origin: new URL(url).origin,
        viewportWidth: width,
        tag,
    }
    note(
        `ext-probe: ${build.manifestName || 'extension'} v${build.manifestVersion} ${build.contentHash}`,
    )
    note(`ext-probe: ${extDir}`)

    const observation = emptyObservation()
    const consoleTrail = []
    const swTrail = []
    // Own profile per run, under the OS temp-ish output dir, removed in the
    // `finally` below. Never a shared or logged-in profile: this process clears
    // extension storage, and doing that to a browser profile someone else owns
    // is how a fleet loses its sessions.
    const profile = join(outDir, `profile-${tag}-${process.pid}`)

    const ctx = await chromium.launchPersistentContext(profile, {
        headless: false,
        viewport: { width, height: 844 },
        args: [
            `--disable-extensions-except=${extDir}`,
            `--load-extension=${extDir}`,
            '--no-first-run',
        ],
    })
    let screenshot = null
    try {
        const page = ctx.pages()[0] || (await ctx.newPage())
        page.on('console', m => {
            const t = m.text()
            if (
                allLogs ||
                /CARAMEL|caramel|AUTO_INSERT|CHECKOUT|COUPON/i.test(t)
            )
                consoleTrail.push(`[${m.type()}] ${t}`)
        })
        page.on('pageerror', e => consoleTrail.push(`[pageerror] ${String(e)}`))
        // The background service worker is where the API calls are made and
        // logged on a dev install, so it says whether the content script ever
        // asked — and it is the ONLY context that can read the extension's own
        // chrome.storage.local. Page `evaluate` runs in the store's world and
        // cannot see it at all.
        let sw = null
        const attachSW = worker => {
            if (!sw) sw = worker
            worker.on('console', m =>
                swTrail.push(`[sw ${m.type()}] ${m.text()}`),
            )
        }
        ctx.serviceWorkers().forEach(attachSW)
        ctx.on('serviceworker', attachSW)

        // An empty cart is not a checkout, and the extension is right not to show
        // there — so seed one first, the way the platform itself would.
        await page.goto(target.origin, {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
        })
        if (!sw)
            sw = await ctx
                .waitForEvent('serviceworker', { timeout: 15000 })
                .catch(() => null)
        // Force the API path. The extension caches the supported-domain list in
        // chrome.storage.local, and staleness must be ruled out by evidence
        // (the API log line below), not by hoping a fixed sleep was long enough.
        if (sw)
            await sw
                .evaluate(
                    key =>
                        new Promise(r =>
                            chrome.storage.local.remove(key, () => r(true)),
                        ),
                    STORE_CACHE_KEY,
                )
                .catch(e =>
                    note(
                        `  (could not clear ${STORE_CACHE_KEY}: ${e.message})`,
                    ),
                )

        const seeded = await page.evaluate(seedShopifyCartInPage, {
            maxRejectedAdds: MAX_REJECTED_ADDS,
            productLimit: DEFAULT_PRODUCT_LIMIT,
        })
        observation.seed = {
            ok: seeded.ok,
            detail: seeded.detail,
            rejectedAdds: seeded.rejectedAdds,
            adds: seeded.adds,
        }
        observation.platform.productsJsonOk = seeded.productsJsonOk
        note(`seed: ${seeded.detail}`)

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
        // The prompt waits on a coupon fetch; give it room, then look regardless.
        // The cart as it stands when the extension is about to look at it — an
        // empty cart here makes silence the CORRECT answer, and reading it only
        // after the wait cannot tell the two apart.
        const cartState = await page.evaluate(readCartStateInPage)
        observation.cartItemsAtArrival = cartState.itemCount
        observation.platform.cartJsOk = cartState.cartJsOk
        note(`cart at arrival: ${cartState.itemCount ?? cartState.detail}`)

        // The flow starts on `load` (measured: 5–8.5s on these stores) and then
        // waits up to 3s on config selectors before probing the cart, so a short
        // window measures the harness rather than the extension.
        // How long a shopper waits before we say anything. Polled rather than
        // awaited so a no-show is a number too, not a hang.
        const deadline = Date.now() + waitMs
        const t0 = Date.now()
        while (Date.now() < deadline) {
            const there = await page
                .evaluate(id => !!document.getElementById(id), PROMPT_HOST_ID)
                .catch(() => false)
            if (there) {
                observation.prompt.appearedMs = Date.now() - t0
                break
            }
            await page.waitForTimeout(250)
        }
        note(
            `prompt appeared after: ${
                observation.prompt.appearedMs === null
                    ? 'never (within window)'
                    : `${observation.prompt.appearedMs}ms`
            }`,
        )

        const promptReport = await page.evaluate(id => {
            const host = document.getElementById(id)
            if (!host) return { present: false }
            const r = host.getBoundingClientRect()
            const cs = getComputedStyle(host)
            const root = host.shadowRoot
            const styleEl = root?.querySelector('style')
            return {
                present: true,
                rect: {
                    w: Math.round(r.width),
                    h: Math.round(r.height),
                    top: Math.round(r.top),
                    right: Math.round(r.right),
                },
                position: cs.position,
                display: cs.display,
                zIndex: cs.zIndex,
                opacity: cs.opacity,
                visibility: cs.visibility,
                transform: cs.transform,
                cssBytes: styleEl ? styleEl.textContent.length : 0,
                // The shipped sheet is an order of magnitude bigger than the
                // inline stub used when the real one fails to load.
                cssIsFallback: styleEl
                    ? styleEl.textContent.length < 2000
                    : null,
                shadowChildren: root ? root.children.length : 0,
            }
        }, PROMPT_HOST_ID)
        Object.assign(observation.prompt, promptReport)

        const promoInputs = await page
            .evaluate(countPromoInputsInPage)
            .catch(() => 0)

        // ── the two witnesses ────────────────────────────────────────────
        // Read promptly: recordTiming keeps only the newest 50 entries, so a
        // chatty run can evict AUTO_INSERT_FETCHCOUPONS_START before we look.
        let timings = []
        let timingsReadOk = false
        let servedRecord = null
        if (sw || ctx.serviceWorkers().length) {
            const timingsRead = await swEval(
                ctx,
                sw,
                key =>
                    new Promise(r =>
                        chrome.storage.local.get([key], v => r(v[key] || [])),
                    ),
                TIMINGS_KEY,
                TIMINGS_KEY,
            )
            timingsReadOk = timingsRead.ok
            timings = timingsRead.value || []
            const cachedRead = await swEval(
                ctx,
                sw,
                key =>
                    new Promise(r =>
                        chrome.storage.local.get([key], v => r(v[key] || null)),
                    ),
                STORE_CACHE_KEY,
                STORE_CACHE_KEY,
            )
            const cached = cachedRead.value
            const host = new URL(url).hostname
            servedRecord =
                (cached?.data || []).find(rec =>
                    hostMatches(rec.domain, host),
                ) || null
        } else {
            note('  (no service worker captured — storage witness unavailable)')
        }

        const wholeTrail = [...consoleTrail, ...swTrail]
        const witnesses = {
            console: { available: true, trail: consoleTrail },
            serviceWorker: { available: !!sw, trail: swTrail },
            // available reflects whether the read actually SUCCEEDED — a live
            // worker whose storage could not be read is not a usable witness,
            // and reporting it as one turns "read failed" into a fabricated
            // "zero timings" disagreement.
            timings: { available: timingsReadOk, trail: timings },
            disagreement: diffWitnesses(wholeTrail, timings),
        }

        // ── derive the observation from what the witnesses saw ────────────
        observation.config.servedFromApi = wholeTrail.some(l =>
            l.includes(API_LOAD_LINE),
        )
        observation.config.served = servedRecord
        observation.config.expected = expectedConfig
        Object.assign(
            observation.config,
            compareConfig(expectedConfig, servedRecord),
        )
        if (servedRecord)
            observation.indicators = {
                priceContainer: servedRecord.priceContainer ?? null,
                successIndicator: servedRecord.successIndicator ?? null,
                errorIndicator: servedRecord.errorIndicator ?? null,
            }

        observation.detection.checkoutViaCartPayload = wholeTrail.some(l =>
            l.includes('CHECKOUT_VIA_CART_PAYLOAD'),
        )
        observation.detection.matchedPromoBox = promoInputs > 0

        const fetchEnd = timings
            .filter(e => e.event === 'AUTO_INSERT_FETCHCOUPONS_END')
            .pop()
        observation.coupons.fetchStarted = timings.some(
            e => e.event === 'AUTO_INSERT_FETCHCOUPONS_START',
        )
        observation.coupons.fetchEnded = !!fetchEnd
        observation.coupons.count =
            fetchEnd && typeof fetchEnd.meta?.count === 'number'
                ? fetchEnd.meta.count
                : null

        const attempts = timings.filter(
            e => e.event === 'AUTO_INSERT_ATTEMPT_END',
        )
        observation.apply.submitted = attempts.length
        const goodCode = flags['good-code'] || null
        const invalidCode = flags['invalid-code'] || null
        if (goodCode) {
            const hit = attempts.find(e => e.meta?.code === goodCode)
            observation.apply.successFiredOnGoodCode = hit
                ? !!hit.meta.success
                : null
        }
        if (invalidCode) {
            const hit = attempts.find(e => e.meta?.code === invalidCode)
            observation.apply.errorFiredOnInvalidCode = hit
                ? !!hit.meta.errorMsg
                : null
        }
        const totals = attempts
            .map(e => e.meta?.newTotal)
            .filter(n => typeof n === 'number')
        if (totals.length) {
            observation.apply.totalBefore = Math.max(...totals)
            observation.apply.totalAfter = Math.min(...totals)
        }

        try {
            await page.screenshot({
                path: screenshotFile,
                timeout: 15000,
                animations: 'disabled',
            })
            screenshot = screenshotFile
        } catch {
            note('  (screenshot timed out — page never went quiet)')
        }

        // UNTRUNCATED, deliberately: the 25-line slice this replaces hid the
        // post-detection stages (entry 25 was CHECKOUT_VIA_CART_PAYLOAD on some
        // stores), which cost a whole night's bisect on 2026-08-07 — the trail
        // ended at FETCHCOUPONS_START and nobody could see it.
        writeFileSync(
            logFile,
            [
                `# ext-probe ${tag} ${url}`,
                `# build ${build.contentHash} v${build.manifestVersion}`,
                '',
                '## page console',
                ...consoleTrail,
                '',
                '## service worker console',
                ...swTrail,
                '',
                '## storage timings (caramel_timings)',
                ...timings.map(e => JSON.stringify(e)),
                '',
            ].join('\n'),
            'utf8',
        )
        note(`full logs: ${logFile}`)

        const report = buildReport({
            target,
            build,
            observation,
            witnesses,
            logFile,
            screenshot,
            durationMs: Date.now() - started,
        })
        // The ONE machine-readable object, alone on stdout.
        const json = JSON.stringify(report, null, 2)
        if (flags.out) writeFileSync(resolve(flags.out), json, 'utf8')
        else process.stdout.write(`${json}\n`)
        note(`verdict: ${report.verdict} (exit ${report.exitCode})`)
        for (const r of report.reasons) note(`  - ${r}`)
        return report.exitCode
    } finally {
        await ctx.close()
        try {
            rmSync(profile, { recursive: true, force: true })
        } catch {
            /* profile is scratch */
        }
    }
}

let code
try {
    code = await main()
} catch (e) {
    // A harness crash is never reported as a store verdict.
    const report = buildReport({ error: e?.stack || String(e) })
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    note(`ext-probe crashed: ${e?.stack || e}`)
    code = report.exitCode
}
process.exit(code)
