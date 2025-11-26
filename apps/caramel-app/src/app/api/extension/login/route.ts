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
            return NextResponse.json(
                { error: errorData?.message || 'Invalid credentials' },
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
