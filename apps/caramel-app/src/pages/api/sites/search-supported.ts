import prisma from '@/lib/prisma'
import { NextApiRequest, NextApiResponse } from 'next'

interface SearchSupportedBody {
    query?: string
}

interface SearchResult {
    site: string
    sim_score: number
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST'])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }

    /* ---------- normalise & validate body ---------- */
    let body: SearchSupportedBody = {}
    try {
        body =
            typeof req.body === 'string'
                ? JSON.parse(req.body || '{}')
                : req.body || {}
    } catch {
        /* malformed JSON → keep body empty */
    }

    const q = String(body.query || '').trim()

    if (!q) return res.status(200).json({ sites: [] })

    const likePattern = `%${q}%`

    try {
        const rows = await prisma.$queryRaw<SearchResult[]>`
            SELECT DISTINCT c.site,
                   COALESCE(similarity(c.site, ${q}), 0) as sim_score
            FROM "Coupon" c
            WHERE c.site ILIKE ${likePattern}
               OR similarity(c.site, ${q}) > 0.25
            ORDER BY sim_score DESC, c.site ASC
        `

        const sites = rows.map(r => r.site)
        return res.status(200).json({ sites })
    } catch (err) {
        const error = err as Error
        console.error('Database error:', err)
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
        })
        return res
            .status(500)
            .json({ error: 'Search failed', details: error.message })
    }
}
