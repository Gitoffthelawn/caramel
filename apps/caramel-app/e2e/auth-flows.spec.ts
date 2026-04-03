import { expect, test } from '@playwright/test'

test.describe('Auth Flows — Login', () => {
    test('login with invalid credentials shows error toast', async ({
        page,
    }) => {
        await page.goto('/login')
        await page.getByPlaceholder('Enter your email').fill('bad@example.com')
        await page.getByPlaceholder('Enter your password').fill('WrongPass1!')

        // Intercept the auth API to return an error without hitting real server
        await page.route('**/api/auth/sign-in/email', route =>
            route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({
                    message: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS',
                }),
            }),
        )

        await page.getByRole('button', { name: /login/i }).click()

        // Sonner toast with error message
        await expect(
            page.getByText(
                /unable to sign in\. please check your email and password/i,
            ),
        ).toBeVisible({ timeout: 5000 })
    })

    test('login with unverified email redirects to /verify', async ({
        page,
    }) => {
        await page.goto('/login')
        await page
            .getByPlaceholder('Enter your email')
            .fill('unverified@example.com')
        await page.getByPlaceholder('Enter your password').fill('Test@12345')

        await page.route('**/api/auth/sign-in/email', route =>
            route.fulfill({
                status: 403,
                contentType: 'application/json',
                body: JSON.stringify({
                    message: 'Email not verified',
                    code: 'EMAIL_NOT_VERIFIED',
                }),
            }),
        )

        await page.getByRole('button', { name: /login/i }).click()
        await expect(page).toHaveURL(/\/verify/, { timeout: 10000 })
    })

    test('token_expired query param shows verification alert', async ({
        page,
    }) => {
        await page.goto('/login?error=token_expired')

        await expect(page.getByText(/verification link expired/i)).toBeVisible({
            timeout: 5000,
        })

        await expect(
            page.getByRole('button', { name: /request new link/i }),
        ).toBeVisible()
    })

    test('invalid_token query param shows verification alert', async ({
        page,
    }) => {
        await page.goto('/login?error=invalid_token')

        await expect(
            page.getByText(/verification link has expired or is invalid/i),
        ).toBeVisible({ timeout: 5000 })
    })

    test('verified=true query param shows success toast', async ({ page }) => {
        await page.goto('/login?verified=true')

        await expect(
            page.getByText(/email verified successfully/i),
        ).toBeVisible({ timeout: 5000 })
    })

    test('Request New Link button navigates to /verify', async ({ page }) => {
        await page.goto('/login?error=token_expired')

        await page
            .getByRole('button', { name: /request new link/i })
            .click({ timeout: 5000 })

        await expect(page).toHaveURL(/\/verify/)
    })
})

test.describe('Auth Flows — Signup', () => {
    test('successful signup redirects to /verify?signup=success', async ({
        page,
    }) => {
        await page.goto('/signup')

        await page.getByPlaceholder('@nickname').fill('testuser')
        await page.getByPlaceholder('Enter your email').fill('new@example.com')
        await page.getByPlaceholder('Create a password').fill('Test@12345')
        await page.getByPlaceholder('Re-type Password').fill('Test@12345')

        // Intercept signup API to return success
        await page.route('**/api/auth/sign-up/email', route =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    user: { id: '1', email: 'new@example.com' },
                    token: 'fake-token',
                }),
            }),
        )

        await page.getByRole('button', { name: 'Sign Up', exact: true }).click()

        // Uses window.location.href so wait for navigation
        await page.waitForURL('**/verify?signup=success', { timeout: 10000 })
    })

    test('signup with existing email shows error toast', async ({ page }) => {
        await page.goto('/signup')

        await page.getByPlaceholder('@nickname').fill('testuser')
        await page
            .getByPlaceholder('Enter your email')
            .fill('taken@example.com')
        await page.getByPlaceholder('Create a password').fill('Test@12345')
        await page.getByPlaceholder('Re-type Password').fill('Test@12345')

        await page.route('**/api/auth/sign-up/email', route =>
            route.fulfill({
                status: 422,
                contentType: 'application/json',
                body: JSON.stringify({
                    message: 'User already exists',
                    code: 'USER_ALREADY_EXISTS',
                }),
            }),
        )

        await page.getByRole('button', { name: 'Sign Up', exact: true }).click()

        await expect(
            page.getByText(/unable to create your account/i),
        ).toBeVisible({ timeout: 5000 })
    })

    test('username too short shows validation error', async ({ page }) => {
        await page.goto('/signup')

        const nickname = page.getByPlaceholder('@nickname')
        await nickname.fill('ab')
        await nickname.blur()

        await page.getByPlaceholder('Enter your email').click()

        // Formik shows error after blur
        await expect(
            page.getByText(/must be at least 4 characters/i),
        ).toBeVisible({ timeout: 5000 })
    })
})

test.describe('Auth Flows — Verify Page', () => {
    test('verify page after signup shows correct messaging', async ({
        page,
    }) => {
        await page.goto('/verify?signup=success')

        await expect(
            page.getByText(/we've sent a verification email/i),
        ).toBeVisible()
        await expect(page.getByText(/didn't receive it/i)).toBeVisible()
    })

    test('verify page without params shows default messaging', async ({
        page,
    }) => {
        await page.goto('/verify')

        await expect(
            page.getByText(/please verify your email address/i),
        ).toBeVisible()
        await expect(
            page.getByText(
                /enter your email below to receive a new verification link/i,
            ),
        ).toBeVisible()
    })

    test('verify page has email input and send button', async ({ page }) => {
        await page.goto('/verify')

        await expect(page.getByPlaceholder('Enter your email')).toBeVisible()
        await expect(
            page.getByRole('button', { name: /send verification email/i }),
        ).toBeVisible()
    })

    test('verify page has link back to login', async ({ page }) => {
        await page.goto('/verify')

        const signInLink = page.getByRole('link', { name: /sign in/i })
        await expect(signInLink).toBeVisible()
        await signInLink.click()
        await expect(page).toHaveURL(/\/login/)
    })

    test('send verification without email shows error toast', async ({
        page,
    }) => {
        await page.goto('/verify')

        await page
            .getByRole('button', { name: /send verification email/i })
            .click()

        await expect(page.getByText(/please enter your email/i)).toBeVisible({
            timeout: 5000,
        })
    })
})

test.describe('Auth Flows — Protected Routes', () => {
    test('profile page redirects unauthenticated user to /login', async ({
        page,
    }) => {
        // Intercept session check to return no session
        await page.route('**/api/auth/get-session', route =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(null),
            }),
        )

        await page.goto('/profile')
        await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    })

    test('profile page shows user data when authenticated', async ({
        page,
    }) => {
        // Intercept session to return a mock user
        await page.route('**/api/auth/get-session', route =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    session: {
                        id: 'session-1',
                        userId: 'user-1',
                        expiresAt: new Date(
                            Date.now() + 7 * 24 * 60 * 60 * 1000,
                        ).toISOString(),
                    },
                    user: {
                        id: 'user-1',
                        name: 'carameluser',
                        email: 'test@example.com',
                        firstName: null,
                        lastName: null,
                    },
                }),
            }),
        )

        await page.goto('/profile')

        await expect(page.getByText('Profile')).toBeVisible({ timeout: 5000 })
        await expect(
            page.getByRole('heading', { name: 'carameluser' }),
        ).toBeVisible()
        await expect(page.getByText('test@example.com').first()).toBeVisible()
    })
})
