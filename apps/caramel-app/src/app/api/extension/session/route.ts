import { withRoute } from '@/lib/api/withRoute'
import { mintExtensionSessionForUser } from '@/lib/auth/extensionOAuthSession'
import { NextResponse } from 'next/server'

// Website→extension sign-in relay: a signed-in page on our own origin
// asks for an extension bearer token so the browser extension can adopt
// the user's session without a second login. Cookie-authenticated
// (auth: 'session') and same-origin only (origin: true rejects
// cross-origin browser callers); the extension side additionally only
// accepts the relayed token from its own origin allowlist.
export const POST = withRoute(
    {
        method: 'POST',
        routeName: 'extension/session',
        rateLimit: 'mutation',
        origin: true,
        auth: 'session',
    },
    async ({ session }) => {
        if (!session?.user?.id) {
            // withRoute's auth gate already 401s a missing session; this
            // guard is for the deleted-user / malformed-session edge.
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const minted = await mintExtensionSessionForUser(session.user.id)
        if (!minted) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.json(minted)
    },
)
