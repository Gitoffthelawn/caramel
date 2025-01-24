export default function seederMiddleware(handler) {
    return async (req, res) => {
        const apiKey = req.headers['x-scraper-api-key'];

        if (apiKey !== process.env.SEEDER_API_KEY) {
            return res.status(403).json({ message: 'Forbidden: Invalid API key' });
        }
        return handler(req, res);
    };
}
