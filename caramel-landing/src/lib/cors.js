import Cors from 'cors';
import { initMiddleware } from './initMiddleware';

// Configure the CORS middleware
export const cors = initMiddleware(
    Cors({
        origin: (origin, callback) => {
            const allowedOrigins = ['https://www.amazon.com', 'https://www.ebay.com', 'https://www.codecademy.com'];
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST'],
        credentials: false,
    })
);
