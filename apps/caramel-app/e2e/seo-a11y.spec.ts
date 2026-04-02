import { expect, test } from '@playwright/test'

test.describe('SEO & Accessibility Basics', () => {
    test('home page has correct title', async ({ page }) => {
        await page.goto('/')
        await expect(page).toHaveTitle(/caramel/i)
    })

    test('home page has meta description', async ({ page }) => {
        await page.goto('/')
        const meta = page.locator('meta[name="description"]')
        await expect(meta).toHaveAttribute('content', /.+/)
    })

    test('login page has correct title', async ({ page }) => {
        await page.goto('/login')
        await expect(page).toHaveTitle(/login|caramel/i)
    })

    test('signup page has correct title', async ({ page }) => {
        await page.goto('/signup')
        await expect(page).toHaveTitle(/sign up|caramel/i)
    })

    test('privacy page has correct title', async ({ page }) => {
        await page.goto('/privacy')
        await expect(page).toHaveTitle(/privacy|caramel/i)
    })

    test('images have alt text', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        const images = page.locator('img')
        const count = await images.count()

        for (let i = 0; i < Math.min(count, 10); i++) {
            const alt = await images.nth(i).getAttribute('alt')
            expect(
                alt !== null && alt !== undefined,
                `Image ${i} should have an alt attribute`,
            ).toBeTruthy()
        }
    })
})

test.describe('Responsive - Mobile Viewport', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('mobile menu toggle exists on home page', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // On mobile, there should be a hamburger menu button
        const menuButton = page.locator('header button').first()
        await expect(menuButton).toBeVisible()
    })

    test('login page is usable on mobile', async ({ page }) => {
        await page.goto('/login')
        await page.waitForLoadState('networkidle')

        await expect(page.getByPlaceholder('Enter your email')).toBeVisible()
        await expect(page.getByPlaceholder('Enter your password')).toBeVisible()
        await expect(page.getByRole('button', { name: /login/i })).toBeVisible()
    })
})
