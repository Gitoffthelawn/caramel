import { fileURLToPath } from 'node:url'
import path from 'node:path'

const packageRoot = fileURLToPath(new URL('.', import.meta.url))
const workspaceRoot = path.resolve(packageRoot, '..', '..')

/** @type {import('next').NextConfig} */
const nextConfig = {
    outputFileTracingRoot: workspaceRoot,
    turbopack: {
        root: workspaceRoot,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'www.google.com',
                port: '',
                pathname: '/s2/favicons/**',
            },
        ],
    },
}

export default nextConfig
