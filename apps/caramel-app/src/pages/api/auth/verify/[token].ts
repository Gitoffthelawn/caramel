import prisma from '@/lib/prisma'
import { NextApiRequest, NextApiResponse } from 'next'

interface VerifyTokenQuery {
    token?: string | string[]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { token } = req.query as VerifyTokenQuery
    
    if (!token || Array.isArray(token)) {
        return res.status(400).json({ error: 'Token is required' })
    }
    
    const user = await prisma.user.findUnique({
        where: {
            token: token,
        },
    })
    
    if (user) {
        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                token: null,
                tokenExpiry: null,
                status: 'ACTIVE_USER',
            },
        })
    }
    
    res.redirect('/login')
}
