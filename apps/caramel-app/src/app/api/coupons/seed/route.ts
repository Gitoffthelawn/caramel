import prisma from '@/lib/prisma'
import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

// This route writes straight into the coupon catalog users see, so it is a
// privileged producer endpoint — never a public one. It shipped with NO auth
// check at all, which let anyone who knew the URL inject arbitrary coupons.
//
// FAILS CLOSED: a missing/blank SEEDER_API_KEY refuses every request (503)
// rather than silently reverting to the open behaviour. An unset secret must
// never be the same thing as "no auth required".
function authorize(req: NextRequest): NextResponse | null {
    const expected = process.env.SEEDER_API_KEY
    if (!expected) {
        console.error('SEEDER_API_KEY is not set — refusing to seed coupons.')
        return NextResponse.json(
            { error: 'Seeding is not configured.' },
            { status: 503 },
        )
    }

    const header = req.headers.get('authorization') ?? ''
    const presented = header.startsWith('Bearer ') ? header.slice(7) : ''
    // Compare over fixed-width digests so the check can't leak the key's
    // length or a matching prefix through timing.
    const a = Buffer.from(presented)
    const b = Buffer.from(expected)
    const ok = a.length === b.length && timingSafeEqual(a, b)
    if (!ok) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }
    return null
}

interface CouponSeedData {
    site: string
    description: string
    code: string
    title: string
    rating: number
    expiry: string
    discount_type?: 'PERCENTAGE' | 'CASH' | 'SAVE'
    discount_amount?: number
    expired?: boolean
    timesUsed?: number
    last_time_used?: string
    sourceId?: string
}

export async function POST(req: NextRequest) {
    // Authorize FIRST — an unauthenticated caller must not even get its body
    // parsed, let alone reach the database.
    const denied = authorize(req)
    if (denied) return denied

    let coupons: CouponSeedData[]
    try {
        coupons = await req.json()
    } catch {
        // Malformed JSON used to reject as an unhandled throw (a 500 blaming
        // the server for the caller's bad request).
        return NextResponse.json(
            { message: 'Invalid JSON body.' },
            { status: 400 },
        )
    }

    if (!Array.isArray(coupons)) {
        return NextResponse.json(
            { message: 'Invalid data format. Expected an array.' },
            { status: 400 },
        )
    }

    if (
        coupons.some(
            coupon =>
                !coupon.site ||
                !coupon.description ||
                !coupon.code ||
                !coupon.title ||
                coupon.rating === undefined ||
                !coupon.expiry,
        )
    ) {
        return NextResponse.json(
            { message: 'Missing required fields in some coupons.' },
            { status: 400 },
        )
    }

    try {
        await prisma.coupon.createMany({
            data: coupons,
            skipDuplicates: true,
        })

        return NextResponse.json({ message: 'Coupons seeded successfully!' })
    } catch (error) {
        console.error((error as Error).message)
        return NextResponse.json(
            { error: 'Error seeding coupons.' },
            { status: 500 },
        )
    }
}
