// lib/couponsDb.ts
//
// Read-only connection to the `caramel_coupons` database owned by the
// Python verification service. All mutations to the coupon catalog flow
// through that service — Next.js only reads (plus two narrow mutations:
// usage-increment and expire, both exposed to the extension).
import { env } from '@/lib/env'
import postgres from 'postgres'

const connectionString = env.COUPONS_DATABASE_URL

// Reuse one client across hot-reloads in dev to avoid pool leaks.
const globalForSql = globalThis as unknown as {
    couponsSql?: ReturnType<typeof postgres>
}

export const couponsSql =
    globalForSql.couponsSql ??
    postgres(connectionString, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false,
    })

if (process.env.NODE_ENV !== 'production') {
    globalForSql.couponsSql = couponsSql
}
