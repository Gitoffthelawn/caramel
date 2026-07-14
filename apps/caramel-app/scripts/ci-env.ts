import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentScriptPath = fileURLToPath(import.meta.url)
const scriptDir = path.dirname(currentScriptPath)
export const projectRoot = path.resolve(scriptDir, '..')
export const repoRoot = path.resolve(scriptDir, '../../..')

export const ciEnvFileContents = `NODE_ENV=development
PORT=58000
PG_PORT=58005
DATABASE_URL="postgresql://postgres:postgres@localhost:58005/caramel?schema=public"
COUPONS_DATABASE_URL="postgresql://postgres:postgres@localhost:58005/caramel_coupons"
BETTER_AUTH_URL="http://localhost:58000"
BETTER_AUTH_SECRET=ci_better_auth_secret
JWT_SECRET=ci_jwt_secret
BCRYPT_SALT_ROUNDS=10
NEXT_PUBLIC_BASE_URL="http://localhost:58000"
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=ci@example.com
SMTP_PASSWORD=ci-smtp-password
SMTP_FROM_ADDRESS=ci@example.com
SMTP_FROM_NAME="CI Bot"
`

const ensureTrailingNewline = (value: string) =>
    value.endsWith('\n') ? value : `${value}\n`

// One-root-compose (F-016): the app now reads apps/caramel-app/.env only —
// the old local-dev/.env.ports port file was deleted, so this writer no longer
// creates it (nothing consumes it anymore).
export const writeCiEnvFiles = (log = false) => {
    const envPath = path.join(projectRoot, '.env')

    fs.writeFileSync(envPath, ensureTrailingNewline(ciEnvFileContents), 'utf8')

    if (log) {
        console.log(`[ci-env] Wrote ${envPath}`)
    }
}

const isDirectExecution =
    process.argv[1] &&
    path.resolve(process.argv[1]) === path.resolve(currentScriptPath)

if (isDirectExecution) {
    writeCiEnvFiles(true)
}
