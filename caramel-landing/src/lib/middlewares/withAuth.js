import { authOptions } from '@/pages/api/auth/[...nextauth]'
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'

/**
 * A higher-order function (HOF) that ensures a user is logged in.
 *
 * Usage:
 * export default withAuth(async function handler(req, res) { ... })
 */
export function withAuth(handler: NextApiHandler) {
    return async function (req: NextApiRequest, res: NextApiResponse) {
        try {
            // @ts-ignore
            const session = await getServerSession(req, res, authOptions)
            // @ts-ignore
            if (!session?.user?.id) {
                return res
                    .status(401)
                    .json({ status: 'error', message: 'Unauthorized' })
            }

            // Attach session & user to req for downstream usage
            ;(req as any).session = session
            ;(req as any).user = session.user

            // Proceed to the actual request handler
            return handler(req, res)
        } catch (error: any) {
            // In case something goes wrong during session retrieval
            return res.status(500).json({
                status: 'error',
                message: error.message || 'Server Error',
            })
        }
    }
}
