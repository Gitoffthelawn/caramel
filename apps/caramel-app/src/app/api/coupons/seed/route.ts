import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'

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
    try {
        // Authentication middleware equivalent - context7 implementation
        // Check for API key first (for seeding), then session auth
        const apiKey =
            req.headers.get('x-api-key') ||
            req.headers.get('authorization')?.replace('Bearer ', '')

        if (apiKey === process.env.SEEDER_API_KEY) {
            // Valid API key - proceed with seeding
        } else {
            // Fallback to session authentication
            const session = await getServerSession(authOptions)

            if (!session?.user?.id) {
                return NextResponse.json(
                    {
                        status: 'error',
                        message:
                            'Unauthorized - Please provide valid API key or login',
                    },
                    { status: 401 },
                )
            }
        }

        const coupons: CouponSeedData[] = await req.json()

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
