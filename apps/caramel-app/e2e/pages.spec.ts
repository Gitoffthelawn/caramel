import { expect, test } from '@playwright/test'

test.describe('Coupons Page', () => {
    test('coupons page loads with content', async ({ page }) => {
        await page.goto('/coupons')

        await expect(page.getByText(/all coupons/i).first()).toBeVisible()
        await expect(page.getByText(/browse.*coupon/i).first()).toBeVisible()
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
