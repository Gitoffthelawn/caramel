'use client'

import { authClient } from '@/lib/auth/client'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function VerifyPageClient() {
    const [email, setEmail] = useState('')
    const [resendingEmail, setResendingEmail] = useState(false)
    const searchParams = useSearchParams()

    useEffect(() => {
        const error = searchParams.get('error')
        if (error === 'token_expired') {
            toast.error(
                'Verification link has expired. Please request a new one.',
                {
                    duration: 5000,
                },
            )
        }
    }, [searchParams])

    const handleResendVerification = async () => {
        if (!email) {
            toast.error('Please enter your email address')
            return
        }

        setResendingEmail(true)
        try {
            await authClient.sendVerificationEmail({
                email: email.trim().toLowerCase(),
                callbackURL: '/login?verified=true',
            })
            toast.success(
                'Verification email sent! Please check your inbox and spam folder.',
                { duration: 5000 },
            )
        } catch (error) {
            toast.error('Failed to send verification email. Please try again.')
        } finally {
            setResendingEmail(false)
        }
    }

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <motion.div
                className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className="text-caramel mb-6 flex justify-center gap-2 text-center text-2xl font-bold">
                    <div className="my-auto">Verify your</div>
                    <Image
                        src="/full-logo.png"
                        alt="logo"
                        height={90}
                        width={90}
                        className="my-auto mt-2"
                    />
                    <div className="my-auto">account</div>
                </h2>

                <div className="mb-6 text-center text-gray-600">
                    <p>Please verify your email address to continue.</p>
                    <p className="mt-2 text-sm">
                        Enter your email below to receive a new verification
                        link.
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-black">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            placeholder="Enter your email"
                            value={email}
                            onChange={event => setEmail(event.target.value)}
                            className="focus:ring-caramel w-full rounded-md border px-4 py-2 focus:outline-none focus:ring-2"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resendingEmail}
                        className="bg-caramel w-full rounded-md py-2 font-semibold text-white transition hover:scale-105 disabled:opacity-50"
                    >
                        {resendingEmail
                            ? 'Sending...'
                            : 'Send verification email'}
                    </button>
                </div>

                <p className="mt-4 text-center text-sm text-gray-600">
                    Already verified?{' '}
                    <Link className="text-caramel font-semibold" href="/login">
                        Sign In
                    </Link>
                </p>
            </motion.div>
        </div>
    )
}
