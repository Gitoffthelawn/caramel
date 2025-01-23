const express = require("express");
const cors = require("cors");
const {PrismaClient} = require("@prisma/client");
const bodyParser = require('body-parser');
const app = express();
const prisma = new PrismaClient();

const apiKeyMiddleware = (req, res, next) => {
    const apiKey = req.headers['x-scraper-api-key'];

    // Check if the API key matches the one in the environment variable
    if (apiKey !== process.env.SEEDER_API_KEY) {
        return res.status(403).json({ message: 'Forbidden: Invalid API key' });
    }

    next();
};
app.set('trust proxy', true);
app.use(bodyParser.json());

app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-SCRAPER-API-KEY']
}));

app.post('/seed-coupons', apiKeyMiddleware, async (req, res) => {
    let coupons = req.body;
    if (!Array.isArray(coupons)) {
        return res.status(400).json({ message: 'Invalid data format. Expected an array.' });
    }
    if (coupons.some(coupon => !coupon.site || !coupon.description || !coupon.code)) {
        return res.status(400).json({ message: 'Invalid data format. Some coupons are missing required fields.' });
    }
    try {
        await prisma.coupon.createMany({
            data: coupons,
            skipDuplicates: true,
        });

        res.status(200).json({ message: 'Coupons seeded successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while seeding coupons." });
    }
});


app.get("/coupons", async (req, res) => {
    try {
        const { site, skip = 0, limit = 10, key_words } = req.query;

        const filters = {
            expired: false,
            site: site,
        };

        if (key_words) {
            const keywordsArray = key_words.split(',').map(keyword => keyword.trim());
            filters.OR = keywordsArray.map(keyword => ({
                description: {
                    contains: keyword,
                    mode: "insensitive"
                }
            }));
        }

        const queryParams = {
            where: filters,
        };

        if (skip) {
            queryParams.skip = parseInt(skip, 10);
        }
        if (limit) {
            queryParams.take = parseInt(limit, 10);
        }

        const coupons = await prisma.coupon.findMany(queryParams);
        res.json(coupons);
    } catch (error) {
        console.error("Error fetching coupons:", error.message);
        res.status(500).json({ error: "An error occurred while fetching coupons." });
    }
});

app.post("/incrementUsedCount/:id", async (req, res) => {
    try {
        const {id} = req.params;

        const updatedCoupon = await prisma.coupon.update({
            where: {id},
            data: {
                timesUsed: {increment: 1},
                last_time_used: new Date().toISOString(),
            },
        });

        res.json(updatedCoupon);
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "An error occurred while updating the coupon."});
    }
});

app.post("/setIsExpired", async (req, res) => {
    try {
        const {ids} = req.body;

        const updatedCoupons = await prisma.coupon.updateMany({
            where: {id: {in: ids}},
            data: {expired: true, expiry: new Date().toISOString()},
        });

        res.json({count: updatedCoupons.count});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: "An error occurred while updating the coupons."});
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
