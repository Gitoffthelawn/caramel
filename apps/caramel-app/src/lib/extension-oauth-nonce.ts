type NonceEntry = {
    token: string
    username: string | null
    image: string | null
    expiresAt: number
}

declare global {
    var __extensionOauthNonceStore: Map<string, NonceEntry> | undefined
}

const TTL_MS = 5 * 60 * 1000

const store: Map<string, NonceEntry> =
    globalThis.__extensionOauthNonceStore ?? new Map<string, NonceEntry>()
globalThis.__extensionOauthNonceStore = store

export function setNonceResult(
    nonce: string,
    value: Omit<NonceEntry, 'expiresAt'>,
) {
    store.set(nonce, { ...value, expiresAt: Date.now() + TTL_MS })
}

export function consumeNonceResult(nonce: string): NonceEntry | null {
    const entry = store.get(nonce)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
        store.delete(nonce)
        return null
    }
    store.delete(nonce)
    return entry
}
