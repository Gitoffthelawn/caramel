import {cors} from "@/lib/cors";
import prisma from "@/lib/prisma";

function getBaseDomain(raw) {
    let hostname = raw;
    try {
        const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
        hostname = u.hostname;
    } catch {
        throw new Error("Could not find base domain");
    }
    const parts = hostname.split(".");
    // for foo.bar.baz.com → baz.com
    return parts.length > 2
        ? parts.slice(-2).join(".")
        : hostname;
}


async function handler(req, res) {
    await cors(req, res);
    if (req.method === 'GET') {
        try {
            const { site, skip = 0, limit = 10, key_words } = req.query;

            const filters = { expired: false };

            if (site) {
                const base = getBaseDomain(site);
                filters.AND = [{
                      OR: [
                        { site: base },
                        { site: { endsWith: `.${base}` } }
                      ]
                }];
            }
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
