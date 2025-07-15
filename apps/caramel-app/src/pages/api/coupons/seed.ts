import prisma from '@/lib/prisma'
import seederMiddleware from '@/pages/api/middlewares/seederMiddleware'
import { NextApiRequest, NextApiResponse } from 'next'

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

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const coupons: CouponSeedData[] = req.body

        if (!Array.isArray(coupons)) {
            return res
                .status(400)
                .json({ message: 'Invalid data format. Expected an array.' })
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
            return res
                .status(400)
                .json({ message: 'Missing required fields in some coupons.' })
        }

        try {
            await prisma.coupon.createMany({
                data: coupons,
                skipDuplicates: true,
            })

            res.status(200).json({ message: 'Coupons seeded successfully!' })
        } catch (error) {
            console.error((error as Error).message)
            res.status(500).json({ error: 'Error seeding coupons.' })
        }
    } else {
        res.setHeader('Allow', ['POST'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
}

export default seederMiddleware(handler)
