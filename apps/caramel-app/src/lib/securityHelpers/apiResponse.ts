import { NextApiRequest, NextApiResponse } from 'next'
import { encryptJsonServer } from './cryptoHelpers'

/**
 * Sends a JSON response.
 * - If API_ENCRYPTION_ENABLED !== "true", returns the payload directly (no "response" key).
 * - If API_ENCRYPTION_ENABLED === "true", returns { response: "<encrypted string>" }.
 */
export function apiResponse(
    req: NextApiRequest,
    res: NextApiResponse,
    statusCode: number,
    message?: string,
    data: any = null,
    error: any = null,
) {
    // Build the payload
    const payload = {
        status: statusCode >= 400 ? 'error' : 'success',
        ...(message && { message }),
        ...(data && { data }),
        ...(error && { error }),
    }

    // If debug logging is enabled, log the raw payload before encryption
    if (process.env.API_ENCRYPTION_DEBUG === 'true') {
        console.log('[apiResponse Debug] Payload before encryption:')
        console.log(payload)
    }

    // Check if encryption is disabled
    if (process.env.API_ENCRYPTION_ENABLED !== 'true') {
        // Return the payload as-is
        return res.status(statusCode).json(payload)
    }

    // Otherwise, encrypt
    const encrypted = encryptJsonServer(req, payload)

    // Return the encrypted string inside { response: ... }
    return res.status(statusCode).json({
        response: encrypted,
    })
}
