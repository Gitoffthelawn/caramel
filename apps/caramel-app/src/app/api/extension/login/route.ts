import { auth } from '@/lib/auth/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    const { email, password } = (await req.json().catch(() => ({}))) as {
        email?: string
        password?: string
    }
    if (!email || !password)
        return NextResponse.json(
            { error: 'Missing email or password' },
            { status: 400 },
        )
    try {
        const response = await auth.api.signInEmail({
            body: { email, password },
            asResponse: true,
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            const errorMessage =
                errorData?.message ||
                errorData?.error?.message ||
                'Invalid credentials'

            // Check if error is about email verification
            const isVerificationError =
                errorData?.error?.code === 'EMAIL_NOT_VERIFIED' ||
                errorMessage.toLowerCase().includes('verify')

            return NextResponse.json(
                {
                    error: isVerificationError
                        ? 'Please verify your email first. Check your inbox for the verification link.'
                        : errorMessage,
                },
                { status: 401 },
            )
        }

        const token = response.headers.get('set-auth-token')
        const data = await response.json()

        if (!token) {
            return NextResponse.json(
                { error: 'Failed to generate token' },
                { status: 500 },
            )
        }

        return NextResponse.json({
            token,
            username:
                data.user?.username ||
                data.user?.name ||
                data.user?.email ||
                null,
            image: data.user?.image || null,
        })
    } catch {
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 },
        )
    }
}
