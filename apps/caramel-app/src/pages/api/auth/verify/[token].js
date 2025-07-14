import prisma from '@/lib/prisma'

export default async function handler(req, res) {
    const { token } = req.query
    if (!token) {
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
