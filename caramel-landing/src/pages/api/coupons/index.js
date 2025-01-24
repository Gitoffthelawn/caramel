import prisma from "../../../../prisma/lib/prisma";

async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const { site, skip = 0, limit = 10, key_words } = req.query;

            const filters = { expired: false };

            if (site) filters.site = site;
            if (key_words) {
                const keywordsArray = key_words.split(',').map(keyword => keyword.trim());
                filters.OR = keywordsArray.map(keyword => ({
                    description: {
                        contains: keyword,
                        mode: 'insensitive',
                    },
                }));
            }

            const coupons = await prisma.coupon.findMany({
                where: filters,
                skip: parseInt(skip, 10),
                take: parseInt(limit, 10),
            });

            res.status(200).json(coupons);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error fetching coupons.' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

export default handler;
