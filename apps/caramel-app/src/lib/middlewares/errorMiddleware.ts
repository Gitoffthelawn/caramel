import { NextApiRequest, NextApiResponse } from 'next'

export const onErrorMiddleware = (error: Error, req: NextApiRequest, res: NextApiResponse) => {
    res.status(500).json({
        status: 'error',
        message: `Internal Server Error: ${error.message}`,
    })
}

export const onNoMatchMiddleware = (req: NextApiRequest, res: NextApiResponse) => {
    res.status(405).json({
        status: 'error',
        message: `Method "${req.method}" Not Allowed`,
    })
}
