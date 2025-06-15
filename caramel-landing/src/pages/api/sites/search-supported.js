import { cors } from "@/lib/cors";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export default async function handler(req, res) {
    await cors(req, res);

    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { query = "", limit = 10 } = req.body || {};
    const q = query.trim();
    if (!q) return res.status(200).json({ sites: [] });

    try {
        const take = Math.max(1, Number(limit) || 10);

        const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT DISTINCT site
      FROM "Coupon"
      WHERE similarity(site, ${q}) > 0.25
      ORDER BY similarity(site, ${q}) DESC
      LIMIT ${take};
    `);

        const sites = rows.map((r) => r.site);
        return res.status(200).json({ sites });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Search failed" });
    }
}
