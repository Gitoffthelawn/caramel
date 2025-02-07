
import prisma from "@/lib/prisma";
import {cors} from "@/lib/cors";

async function handler(req, res) {
    await cors(req, res);
    if (req.method === 'GET') {
        const { id } = req.query;

        try {
            const updatedCoupon = await prisma.coupon.update({
                where: { id },
                data: {
                    timesUsed: { increment: 1 },
                    last_time_used: new Date().toISOString(),
                },
            });

            res.status(200).json(updatedCoupon);
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ error: 'Error updating coupon usage.' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

export default handler;
