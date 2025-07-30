'use client'

import { isValidUrl } from '@/lib/urlHelper'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { toast } from 'react-toastify'

export default function SuggestionForm({
    initialValue,
    resetValue,
}: {
    initialValue: string
    resetValue: () => void
}) {
    const [url, setUrl] = useState(initialValue)
    const [loading, setLoading] = useState(false)

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!url.trim()) return
        if (!isValidUrl(url)) {
            toast.warn('Please enter a valid URL.')
            return
        }
        setLoading(true)
        try {
            await fetch('/api/sites/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            })
            toast.success(`Thanks! We’ll look into supporting ${url} soon`)
        } catch (err) {
            toast.error('Failed to send suggestion. Please try again later.')
            console.error(err)
        }
        resetValue()
        setLoading(false)
    }

    return (
        <form
            onSubmit={submit}
            className="from-caramel/5 to-caramel/5 dark:from-caramel/10 dark:to-caramel/10 border-caramel/20 dark:border-caramel/30 flex w-full flex-col items-center gap-6 rounded-3xl border bg-gradient-to-br via-orange-50/20 p-8 shadow-md sm:p-6 dark:via-orange-900/10"
        >
            <p className="text-center leading-relaxed text-gray-700 dark:text-gray-300">
                We don’t support that store yet. Let us know and we’ll add it!
            </p>
            <motion.button
                whileTap={{ scale: 0.95 }}
                className="from-caramel rounded-full bg-gradient-to-r to-orange-600 px-8 py-3 font-semibold text-white shadow transition-all hover:shadow-lg"
            >
                {loading ? (
                    'Sending…'
                ) : (
                    <>
                        Request Support for{' '}
                        <span className="font-bold">{url}</span>
                    </>
                )}
            </motion.button>
        </form>
    )
}
