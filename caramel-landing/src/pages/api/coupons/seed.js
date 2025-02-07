import prisma from "@prisma/client";
import seederMiddleware from '@/pages/api/middlewares/seederMiddleware';

async function handler(req, res) {
    if (req.method === 'POST') {
        const coupons = req.body;

        if (!Array.isArray(coupons)) {
            return res.status(400).json({ message: 'Invalid data format. Expected an array.' });
        }

        if (coupons.some(coupon => !coupon.site || !coupon.description || !coupon.code)) {
            return res.status(400).json({ message: 'Missing required fields in some coupons.' });
        }

        try {
            await prisma.coupon.createMany({
                data: coupons,
                skipDuplicates: true,
            });

            res.status(200).json({ message: 'Coupons seeded successfully!' });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ error: 'Error seeding coupons.' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

export default seederMiddleware(handler);
