import { authorize, timedCheck } from '@/lib/health'
import prisma from '@/lib/prisma'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    if (!authorize(request))
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const result = await timedCheck('database', async () => {
        await prisma.$queryRaw`SELECT 1`
    })

    return NextResponse.json(result, {
        status: result.status === 'ok' ? 200 : 503,
    })
}
