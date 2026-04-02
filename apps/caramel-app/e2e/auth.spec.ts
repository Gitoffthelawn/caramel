import { expect, test } from '@playwright/test'

test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login')
        await expect(page.getByRole('button', { name: /login/i })).toBeVisible()
    })

    test('login form renders with all fields', async ({ page }) => {
        await expect(page.getByPlaceholder('Enter your email')).toBeVisible()
        await expect(page.getByPlaceholder('Enter your password')).toBeVisible()
        await expect(page.getByRole('button', { name: /login/i })).toBeVisible()
    })

    test('social login buttons are present', async ({ page }) => {
        await expect(
            page.getByRole('button', { name: /sign in with google/i }),
        ).toBeVisible()
        await expect(
            page.getByRole('button', { name: /sign in with apple/i }),
        ).toBeVisible()
    })

    test('has link to signup page', async ({ page }) => {
        const signupLink = page.getByRole('link', { name: /sign up/i })
        await expect(signupLink).toBeVisible()
        await signupLink.click()
        await expect(page).toHaveURL(/\/signup/)
    })

    test('shows validation on empty submit', async ({ page }) => {
        await page.getByRole('button', { name: /login/i }).click()
        // HTML5 form validation should prevent submission
        const emailInput = page.getByPlaceholder('Enter your email')
        const isInvalid = await emailInput.evaluate(
            (el: HTMLInputElement) => !el.validity.valid,
        )
        expect(isInvalid).toBe(true)
    })
})

test.describe('Signup Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/signup')
        await expect(
            page.getByRole('button', { name: 'Sign Up', exact: true }),
        ).toBeVisible()
    })

    test('signup form renders with all fields', async ({ page }) => {
        await expect(page.getByPlaceholder('@nickname')).toBeVisible()
        await expect(page.getByPlaceholder('Enter your email')).toBeVisible()
        await expect(page.getByPlaceholder('Create a password')).toBeVisible()
        await expect(page.getByPlaceholder('Re-type Password')).toBeVisible()
        await expect(
            page.getByRole('button', { name: 'Sign Up', exact: true }),
        ).toBeVisible()
    })

    test('social signup buttons are present', async ({ page }) => {
        await expect(
            page.getByRole('button', { name: /sign up with google/i }),
        ).toBeVisible()
        await expect(
            page.getByRole('button', { name: /sign up with apple/i }),
        ).toBeVisible()
    })

    test('has link to login page', async ({ page }) => {
        const loginLink = page.getByRole('link', { name: /login/i })
        await expect(loginLink).toBeVisible()
        await loginLink.click()
        await expect(page).toHaveURL(/\/login/)
    })

    test('password strength checker appears on focus', async ({ page }) => {
        const passwordInput = page.getByPlaceholder('Create a password')
        await passwordInput.click()
        await passwordInput.fill('test')

        // The password checker component should become visible
        const checker = page
            .locator('[class*="password"]')
            .or(page.getByText(/uppercase|special character|number/i).first())
        await expect(checker).toBeVisible({ timeout: 5000 })
    })

    test('shows validation errors for weak password', async ({ page }) => {
        await page.getByPlaceholder('@nickname').fill('testuser')
        await page.getByPlaceholder('Enter your email').fill('test@example.com')
        await page.getByPlaceholder('Create a password').fill('weak')
        await page.getByPlaceholder('Re-type Password').fill('weak')

        await page
            .getByRole('button', { name: 'Sign Up', exact: true })
            .click({ force: true })

        // Should show password validation errors
        const errorText = page.getByText(
            /uppercase|special character|at least|password/i,
        )
        await expect(errorText.first()).toBeVisible({ timeout: 5000 })
    })

    test('shows mismatch error when passwords differ', async ({ page }) => {
        // Click password field to trigger PasswordChecker visibility
        const passwordInput = page.getByPlaceholder('Create a password')
        await passwordInput.click()
        await passwordInput.fill('Test@12345')

        const confirmInput = page.getByPlaceholder('Re-type Password')
        await confirmInput.click()
        await confirmInput.fill('Different@123')

        // PasswordChecker shows "Passwords must match" when passwords differ
        const mismatch = page.getByText('Passwords must match')
        await expect(mismatch).toBeVisible({ timeout: 5000 })
    })
})
