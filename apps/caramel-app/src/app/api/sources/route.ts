import { handleRouteError } from '@/lib/api/handleRouteError'
import { nextApiResponse } from '@/lib/apiResponseNext'
import { couponsSql } from '@/lib/couponsDb'
import {
    checkRateLimit,
    forbiddenOrigin,
    isOriginAllowed,
} from '@/lib/rateLimit'
import { NextRequest } from 'next/server'

type SourceMetrics = {
    id: string
    source: string
    websites: string[]
    numberOfCoupons: number
    successRate: number
    status: string
}

export async function GET(req: NextRequest) {
    const limited = await checkRateLimit(req, 'read')
    if (limited) return limited

    try {
        const rows = await couponsSql<
            Array<{
                id: string
                source: string
                websites: string[]
                status: string
                total_coupons: number
                total_used: number
                total_expired: number
            }>
        >`
            SELECT
                s.id,
                s.source,
                s.websites,
                s.status,
                COALESCE(COUNT(c.id), 0)::int AS total_coupons,
                COALESCE(SUM(c.times_used), 0)::int AS total_used,
                COALESCE(SUM(CASE WHEN c.expired THEN 1 ELSE 0 END), 0)::int AS total_expired
            FROM sources s
            LEFT JOIN coupons c ON c.source_id = s.id
            WHERE s.status = 'ACTIVE'
            GROUP BY s.id, s.source, s.websites, s.status
        `

        const sourcesWithMetrics: SourceMetrics[] = rows
            .map(r => {
                const denom = r.total_used + r.total_expired
                const successRate =
                    denom === 0 ? 0 : (r.total_used / denom) * 100
                return {
                    id: r.id,
                    source: r.source,
                    websites: r.websites,
                    numberOfCoupons: r.total_coupons,
                    successRate: parseFloat(successRate.toFixed(2)),
                    status: r.status,
                }
            })
            .sort((a, b) => b.successRate - a.successRate)

        return nextApiResponse(req, 200, 'sources', sourcesWithMetrics)
    } catch (error) {
        console.error('Error fetching sources:', error)
        return handleRouteError(error, {
            req,
            message: 'Error fetching sources.',
        })
    }
}

export async function POST(req: NextRequest) {
    if (!isOriginAllowed(req)) return forbiddenOrigin()
    const limited = await checkRateLimit(req, 'mutation')
    if (limited) return limited

    try {
        const body = (await req.json().catch(() => ({}))) as {
            website?: string
        }
        const website = body.website?.trim()
        if (!website) {
            return nextApiResponse(req, 400, 'Missing required fields.', null)
        }
        // Validate it's a plausible domain/URL and bound the length, so this
        // public "request a store" endpoint can't be used to bulk-insert junk.
        let host = website
        try {
            host = new URL(
                website.startsWith('http') ? website : `https://${website}`,
            ).hostname
        } catch {
            return nextApiResponse(req, 400, 'Invalid website.', null)
        }
        if (host.length > 253 || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) {
            return nextApiResponse(req, 400, 'Invalid website.', null)
        }

        await couponsSql`
            INSERT INTO sources (id, source, websites, status, created_at, updated_at)
            VALUES (
                gen_random_uuid()::text,
                ${website},
                ${[] as string[]},
                'REQUESTED',
                NOW(),
                NOW()
            )
        `
        return nextApiResponse(
            req,
            200,
            'Source submission requested successfully!',
        )
    } catch (error) {
        console.error('Error creating source:', error)
        return handleRouteError(error, {
            req,
            message: 'Error creating source.',
        })
    }
}
