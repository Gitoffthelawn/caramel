import { cors } from '@/lib/cors'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextApiRequest, NextApiResponse } from 'next'

interface LoginBody {
    email: string
    password: string
}

interface LoginResponse {
    token: string
    username: string | null
    image: string | null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await cors(req, res)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { email, password }: LoginBody = req.body ?? {}
    if (!email || !password) {
        return res.status(400).json({ error: 'Missing email or password' })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: email },
        })
        if (!user || !user.password) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' })
        }
        
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ error: 'Internal server error' })
        }
        
        const token = jwt.sign(
            {
                sub: user.id,
                email: user.email,
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' },
        )

        const response: LoginResponse = {
            token,
            username: user.username,
            image: user.image || null,
        }

        return res.status(200).json(response)
    } catch (error) {
        console.error('Remote login error:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
