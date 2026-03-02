import type { Metadata } from 'next'
import ProfilePageClient from './ProfilePageClient'

const title = 'Profile | Caramel'
const description = 'View and manage your Caramel profile'

export const metadata: Metadata = {
    title,
    description,
    robots: {
        index: false,
        follow: false,
    },
}

export default function ProfilePage() {
    return <ProfilePageClient />
}
