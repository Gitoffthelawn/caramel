import { argosScreenshot } from '@argos-ci/playwright'
import { Page, test } from '@playwright/test'

test.describe.configure({ timeout: 60000 })

async function waitForPageAssets(page: Page) {
    await page.evaluate(async () => {
        const waitWithTimeout = async (
            promise: Promise<unknown>,
            timeoutMs: number,
        ) => {
            await Promise.race([
                promise,
                new Promise(resolve => setTimeout(resolve, timeoutMs)),
            ])
        }

        if (document.fonts?.ready) {
            await waitWithTimeout(document.fonts.ready, 5000)
        }

        await waitWithTimeout(
            Promise.allSettled(
                Array.from(document.images)
                    .filter(image => !image.complete)
                    .map(
                        image =>
                            new Promise<void>(resolve => {
                                image.addEventListener(
                                    'load',
                                    () => resolve(),
                                    {
                                        once: true,
                                    },
                                )
                                image.addEventListener(
                                    'error',
                                    () => resolve(),
                                    {
                                        once: true,
                                    },
                                )
                            }),
                    ),
            ),
            5000,
        )
    })
}

async function triggerInViewAnimations(page: Page) {
    await page.evaluate(async () => {
        const step = Math.max(Math.floor(window.innerHeight * 0.8), 1)
        const maxScroll = Math.max(
            document.documentElement.scrollHeight - window.innerHeight,
            0,
        )

        for (let position = 0; position <= maxScroll; position += step) {
            window.scrollTo({ top: position, behavior: 'auto' })
            await new Promise(resolve => setTimeout(resolve, 75))
        }

        window.scrollTo({ top: maxScroll, behavior: 'auto' })
        await new Promise(resolve => setTimeout(resolve, 150))
        window.scrollTo({ top: 0, behavior: 'auto' })
    })
}

async function prepareVisualPage(
    page: Page,
    path: string,
    readySelector?: string,
) {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await page.addStyleTag({
        content: `
            *, *::before, *::after {
                animation-duration: 0s !important;
                animation-delay: 0s !important;
                transition-duration: 0s !important;
                transition-delay: 0s !important;
                scroll-behavior: auto !important;
            }
        `,
    })
    await waitForPageAssets(page)

    if (readySelector) {
        await page.locator(readySelector).first().waitFor({ state: 'visible' })
    }

    await triggerInViewAnimations(page)
    await page.waitForTimeout(250)
}

test.describe('Visual Regression - Caramel Public Pages', () => {
    test('home page', async ({ page }) => {
        await prepareVisualPage(page, '/', '#features')
        await argosScreenshot(page, 'home-page', {
            animations: 'disabled',
            fullPage: true,
        })
    })

    test('privacy page', async ({ page }) => {
        await prepareVisualPage(page, '/privacy', 'main')
        await argosScreenshot(page, 'privacy-page', {
            animations: 'disabled',
            fullPage: true,
        })
    })

    test('supported stores page', async ({ page }) => {
        await prepareVisualPage(page, '/supported-stores', 'input')
        await argosScreenshot(page, 'supported-stores-page', {
            animations: 'disabled',
            fullPage: true,
        })
    })

    test('pricing page', async ({ page }) => {
        await prepareVisualPage(page, '/pricing', 'main')
        await argosScreenshot(page, 'pricing-page', {
            animations: 'disabled',
            fullPage: true,
        })
    })

    test('coupons page', async ({ page }) => {
        await prepareVisualPage(page, '/coupons', 'main')
        await argosScreenshot(page, 'coupons-page', {
            animations: 'disabled',
            fullPage: true,
        })
    })

    test('login page', async ({ page }) => {
        await prepareVisualPage(page, '/login', 'form')
        await argosScreenshot(page, 'login-page', {
            animations: 'disabled',
            fullPage: true,
        })
    })

    test('signup page', async ({ page }) => {
        await prepareVisualPage(page, '/signup', 'form')
        await argosScreenshot(page, 'signup-page', {
            animations: 'disabled',
            fullPage: true,
        })
    })

    test('sources page', async ({ page }) => {
        await prepareVisualPage(page, '/sources', 'table')
        await argosScreenshot(page, 'sources-page', {
            animations: 'disabled',
            fullPage: true,
        })
    })
})
