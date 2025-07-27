import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
    interface Session {
        accessToken?: string
        user: {
            id: string
            username?: string | null
            email?: string | null
            name?: string | null
            image?: string | null
        }
    }

    interface User {
        id: string
        username?: string | null
        email?: string | null
        name?: string | null
        image?: string | null
        status?: string
        password?: string | null
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string
        accessToken?: string
    }
}
