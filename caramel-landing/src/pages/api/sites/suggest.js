import { cors } from "@/lib/cors";
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { url = "" } = req.body || {};
    const cleaned = url.trim();
    if (!cleaned) return res.status(400).json({ error: "Missing url" });

    try {
        await prisma.siteSuggestion.upsert({
            where: { url: cleaned },
            create: { url: cleaned },
            update: {},
        });
        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Could not save suggestion" });
    }
}
