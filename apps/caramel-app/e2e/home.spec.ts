import { expect, Page, test } from '@playwright/test'

async function gotoHomePage(page: Page) {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(
        page.getByRole('heading', { name: /welcome to/i }).first(),
    ).toBeVisible()
}

test.describe('Home Page - Critical Sections', () => {
    test.describe.configure({ timeout: 60000 })

    test.beforeEach(async ({ page }) => {
        await gotoHomePage(page)
    })

    test('hero section loads with CTA buttons', async ({ page }) => {
        await expect(page.getByText('Welcome to')).toBeVisible()

        const installBtn = page.getByRole('link', {
            name: /install extension/i,
        })
        await expect(installBtn).toBeVisible()

        const sourceBtn = page.getByRole('link', {
            name: /view source code/i,
        })
        await expect(sourceBtn).toBeVisible()
        await expect(sourceBtn).toHaveAttribute(
            'href',
            /github\.com\/DevinoSolutions\/caramel/,
        )
    })

    test('features section is present', async ({ page }) => {
        const section = page.getByText('Why Choose Caramel?')
        await expect(section.first()).toBeVisible()
    })

    test('feature cards render', async ({ page }) => {
        await expect(
            page.getByRole('heading', { name: 'Automated Coupon Application' }),
        ).toBeVisible()
        await expect(
            page.getByRole('heading', { name: 'Privacy-First & Transparent' }),
        ).toBeVisible()
        await expect(
            page.getByRole('heading', { name: '100% Open Source' }).first(),
        ).toBeVisible()
        await expect(
            page.getByRole('heading', { name: 'Creator-Friendly' }),
        ).toBeVisible()
        await expect(
            page.getByRole('heading', { name: 'Lightning Fast' }),
        ).toBeVisible()
        await expect(
            page.getByRole('heading', { name: 'Cross-Browser Support' }),
        ).toBeVisible()
    })

    test('browser install links are present', async ({ page }) => {
        const installSection = page.locator('#install-extension')
        await installSection.scrollIntoViewIfNeeded()

        const chromeLink = installSection.getByRole('link', {
            name: /chrome/i,
        })
        await expect(chromeLink).toBeVisible()
        await expect(chromeLink).toHaveAttribute(
            'href',
            /chromewebstore\.google\.com/,
        )

        const firefoxLink = installSection.getByRole('link', {
            name: /firefox/i,
        })
        await expect(firefoxLink).toBeVisible()
        await expect(firefoxLink).toHaveAttribute(
            'href',
            /addons\.mozilla\.org/,
        )

        const safariLink = installSection.getByRole('link', {
            name: /safari/i,
        })
        await expect(safariLink).toBeVisible()
        await expect(safariLink).toHaveAttribute('href', /apps\.apple\.com/)

        const edgeLink = installSection.getByRole('link', { name: /edge/i })
        await expect(edgeLink).toBeVisible()
        await expect(edgeLink).toHaveAttribute(
            'href',
            /microsoftedge\.microsoft\.com/,
        )
    })

    test('comparison section shows Caramel vs Others', async ({ page }) => {
        const comparison = page.getByRole('heading', {
            name: 'Caramel vs Others',
        })
        await comparison.scrollIntoViewIfNeeded()
        await expect(comparison).toBeVisible()

        await expect(page.getByText('Privacy Protection')).toBeVisible()
        await expect(
            page.getByRole('heading', { name: /data collection/i }),
        ).toBeVisible()
    })
})
