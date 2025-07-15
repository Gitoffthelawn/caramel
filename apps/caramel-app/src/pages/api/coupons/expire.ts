import { cors } from '@/lib/cors'
import prisma from '@/lib/prisma'
import { NextApiRequest, NextApiResponse } from 'next'

interface ExpireCouponsBody {
    ids: string[]
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    await cors(req, res)
    if (req.method === 'POST') {
        const { ids }: ExpireCouponsBody = req.body

        try {
            const updatedCoupons = await prisma.coupon.updateMany({
                where: { id: { in: ids } },
                data: {
                    expired: true,
                    expiry: new Date().toISOString(),
                },
            })

            res.status(200).json({ count: updatedCoupons.count })
        } catch (error) {
            console.error((error as Error).message)
            res.status(500).json({ error: 'Error marking coupons as expired.' })
        }
    } else {
        res.setHeader('Allow', ['POST'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
}

export default handler
