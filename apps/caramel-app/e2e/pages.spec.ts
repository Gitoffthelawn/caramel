import { expect, test } from '@playwright/test'

test.describe('Coupons Page', () => {
    test('coupons page loads with content', async ({ page }) => {
        await page.goto('/coupons')

        await expect(page.getByText(/all coupons/i).first()).toBeVisible()
        await expect(page.getByText(/browse.*coupon/i).first()).toBeVisible()
    })

    // Deployment-safe (runs in BOTH e2e contexts — docs/testing.md "E2E runs
    // in TWO contexts"): the /coupons client fetch → /api/coupons read path →
    // CouponCard render, proven by a GENERIC card landmark. No catalog is
    // ever legitimately empty here — hermetic e2e-pr/local is seeded by the
    // catalog_seed migration, and the deployed dev site serves the real
    // ingested catalog — so at least one card with its CTA must render.
    test('renders at least one coupon card from the catalog', async ({
        page,
    }) => {
        await page.goto('/coupons')

        // Client-side fetch + render, so allow generous time for the first page.
        await expect(
            page.getByRole('button', { name: /get coupon code/i }).first(),
        ).toBeVisible({ timeout: 15000 })
    })

    // HERMETIC-ONLY (gated like auth-flows' "Login (real session)" group —
    // docs/testing.md two-context rule): asserts a SPECIFIC synthetic seed row,
    // which only exists in the fresh-seeded e2e-pr/local DB. On the deployed
    // dev site (e2e-push, no DATABASE_URL) the catalog is REAL ingested data:
    // real rows outrank the anchor's 4.9 rating and a full-catalog ingest
    // tombstones the synthetic rows — asserting it there failed 3/3, hence the
    // gate. Anchor: the highest-rated (4.9) synthetic coupon "40% off Pro
    // annual" (codecademy.com, LEARN40), which ORDER BY rating DESC,
    // created_at DESC guarantees on the first page of a freshly seeded DB —
    // see prisma/migrations/20260714220157_catalog_seed/migration.sql
    // (SYNTHETIC, never the real scraped catalog).
    test('renders the synthetic seed anchor coupon (hermetic DB only)', async ({
        page,
    }) => {
        test.skip(
            !process.env.DATABASE_URL,
            'asserts a synthetic catalog_seed row — only present in the hermetic e2e-pr/local DB (docs/testing.md two-context rule)',
        )
        await page.goto('/coupons')

        await expect(page.getByText('40% off Pro annual').first()).toBeVisible({
            timeout: 15000,
        })
    })

    test('sidebar has browser install links', async ({ page }) => {
        await page.goto('/coupons')

        const chromeLink = page.getByRole('link', { name: /chrome/i })
        await expect(chromeLink.first()).toBeVisible()
    })

    test('sidebar links to supported stores', async ({ page }) => {
        await page.goto('/coupons')

        const supportedLink = page.getByRole('link', {
            name: /view all supported stores/i,
        })
        await expect(supportedLink).toBeVisible()
        await expect(supportedLink).toHaveAttribute('href', /supported-stores/)
    })
})

test.describe('Pricing Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/pricing')
        await expect(
            page.getByText('Simple, Transparent Pricing').first(),
        ).toBeVisible()
    })

    test('shows free pricing', async ({ page }) => {
        await expect(
            page.getByText('Simple, Transparent Pricing').first(),
        ).toBeVisible()
        await expect(page.getByText('$0').first()).toBeVisible()
        await expect(page.getByText('Forever').first()).toBeVisible()
    })

    test('pricing card shows features', async ({ page }) => {
        await expect(page.getByText('ALWAYS FREE').first()).toBeVisible()
        await expect(page.getByText('Free Forever Plan').first()).toBeVisible()
        await expect(
            page.getByText('No credit card required').first(),
        ).toBeVisible()
        await expect(
            page.getByText('No hidden fees ever').first(),
        ).toBeVisible()
    })

    test('CTA button links to GitHub', async ({ page }) => {
        const cta = page.getByRole('link', {
            name: /get started.*free/i,
        })
        await expect(cta).toBeVisible()
        await expect(cta).toHaveAttribute(
            'href',
            /github\.com\/DevinoSolutions\/caramel/,
        )
    })
})

test.describe('Privacy Page', () => {
    test('privacy page renders content', async ({ page }) => {
        await page.goto('/privacy')

        await expect(page.getByText(/privacy/i).first()).toBeVisible()
    })
})

test.describe('Supported Stores Page', () => {
    test('supported stores page loads', async ({ page }) => {
        await page.goto('/supported-stores')

        // The page should have a search or list of stores
        await expect(page.locator('body')).toContainText(/supported|stores/i)
    })
})

test.describe('Sources Page', () => {
    test('sources page loads with content', async ({ page }) => {
        await page.goto('/sources')

        // The page should show coupon source information
        await expect(page.locator('body')).toContainText(/source/i)
    })
})
