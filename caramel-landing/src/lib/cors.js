import Cors from 'cors';
import { initMiddleware } from './initMiddleware';

// Configure the CORS middleware
export const cors = initMiddleware(
    Cors({
        origin: (origin, callback) => {
            const allowedOrigins = ['https://www.amazon.com', 'https://www.ebay.com', 'https://www.codecademy.com'];
            const extensionPatterns = [
                /^chrome-extension:\/\/[a-z]{32}$/, // Chrome extension IDs (32 chars)
                /^safari-extension:\/\/[a-z0-9-]+$/, // Safari extension IDs
            ];

            if (!origin ||
                allowedOrigins.includes(origin) ||
                extensionPatterns.some((pattern) => pattern.test(origin))) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST'],
        credentials: false,
    })
);
