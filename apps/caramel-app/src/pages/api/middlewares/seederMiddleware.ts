import { NextApiRequest, NextApiResponse } from 'next'

type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void

export default function seederMiddleware(handler: ApiHandler) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        const apiKey = req.headers['x-scraper-api-key']

        if (apiKey !== process.env.SEEDER_API_KEY) {
            return res
                .status(403)
                .json({ message: 'Forbidden: Invalid API key' })
        }
        return handler(req, res)
    }
}
