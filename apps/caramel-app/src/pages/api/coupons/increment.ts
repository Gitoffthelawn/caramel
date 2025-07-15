import { cors } from '@/lib/cors'
import prisma from '@/lib/prisma'
import { NextApiRequest, NextApiResponse } from 'next'

interface IncrementCouponQuery {
    id?: string | string[]
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    await cors(req, res)
    if (req.method === 'GET') {
        const { id } = req.query as IncrementCouponQuery

        if (!id || Array.isArray(id)) {
            return res.status(400).json({ error: 'Invalid or missing coupon ID' })
        }

        try {
            const updatedCoupon = await prisma.coupon.update({
                where: { id },
                data: {
                    timesUsed: { increment: 1 },
                    last_time_used: new Date().toISOString(),
                },
            })

            res.status(200).json(updatedCoupon)
        } catch (error) {
            console.error((error as Error).message)
            res.status(500).json({ error: 'Error updating coupon usage.' })
        }
    } else {
        res.setHeader('Allow', ['GET'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
}

export default handler
