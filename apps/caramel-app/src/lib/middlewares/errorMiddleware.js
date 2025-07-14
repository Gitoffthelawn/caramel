export const onErrorMiddleware = (error, req, res) => {
    res.status(500).json({
        status: 'error',
        message: `Internal Server Error: ${error.message}`,
    })
}

export const onNoMatchMiddleware = (req, res) => {
    res.status(405).json({
        status: 'error',
        message: `Method "${req.method}" Not Allowed`,
    })
}
