'use client'

import { signUp } from '@/lib/auth/client'
import { useFormik } from 'formik'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { object, ref, string } from 'yup'

const PasswordChecker = dynamic(
    () => import('@/components/PasswordStrength/PasswordChecker'),
    { ssr: false },
)

const validationSchema = object().shape({
    username: string().min(4).required('Please enter your username'),
    email: string().email().required('Please enter your email'),
    password: string()
        .min(5)
        .matches(/[A-Z]/)
        .matches(/[0-9]/)
        .matches(/[!@#$%^&*+\-]/)
        .required(
            'Password must contain at least 5 characters, 1 uppercase, 1 number and 1 special character',
        ),
    confirmPassword: string()
        .oneOf([ref('password')])
        .required("Password doesn't match"),
})

export default function SignupPageClient() {
    const [showPasswordChecker, setShowPasswordChecker] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const formik = useFormik({
        initialValues: {
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
        validationSchema,
        onSubmit: async ({ username, email, password }) => {
            setLoading(true)
            setError('')
            try {
                const result = await signUp.email({
                    name: username.trim().toLowerCase(),
                    email: email.trim().toLowerCase(),
                    password,
                    username: username.trim().toLowerCase(),
                })

                if (result?.error) {
                    toast.error(
                        'Unable to create your account. Please try again or use a different email.',
                    )
                    setError('Unable to create account')
                    return
                }

                toast.success(
                    'Account created! Please check your email to verify.',
                )
                window.location.href = '/login'
            } catch {
                toast.error('Something went wrong. Please try again later.')
                setError('Something went wrong')
            } finally {
                setLoading(false)
            }
        },
    })

    const { handleSubmit, errors, touched, handleChange, handleBlur, values } =
        formik

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <motion.div
                className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className="text-caramel mb-6 flex justify-center gap-2 text-center text-2xl font-bold">
                    <div className="my-auto">Create your</div>
                    <Image
                        src="/full-logo.png"
                        alt="logo"
                        height={90}
                        width={90}
                        className="my-auto mt-2"
                    />
                    <div className="my-auto">account</div>
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-black">
                            {' '}
                            Choose a nickname
                        </label>
                        <input
                            type="text"
                            onBlur={handleBlur}
                            required
                            name={'username'}
                            onChange={handleChange}
                            placeholder="@nickname"
                            className="focus:ring-caramel w-full rounded-md border px-4 py-2 focus:outline-none focus:ring-2"
                        />
                        <div className="ml-2 h-1 pb-2">
                            {errors.username && touched.username && (
                                <div className="text-sm text-red-500">
                                    {errors.username}
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-black">
                            Email
                        </label>
                        <input
                            onBlur={handleBlur}
                            type="email"
                            name={'email'}
                            required
                            onChange={handleChange}
                            placeholder="Enter your email"
                            className="focus:ring-caramel w-full rounded-md border px-4 py-2 focus:outline-none focus:ring-2"
                        />
                        <div className="ml-2 h-1 pb-2">
                            {errors.email && touched.email && (
                                <div className="text-sm text-red-500">
                                    {errors.email}
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-black">
                            Password
                        </label>
                        <input
                            onBlur={handleBlur}
                            onClick={() => setShowPasswordChecker(true)}
                            type="password"
                            name={'password'}
                            required
                            onChange={handleChange}
                            placeholder="Create a password"
                            className="focus:ring-caramel mb-2 w-full rounded-md border px-4 py-2 focus:outline-none focus:ring-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-black">
                            Re-type Password
                        </label>
                        <input
                            onBlur={handleBlur}
                            onClick={() => setShowPasswordChecker(true)}
                            type="password"
                            name={'confirmPassword'}
                            required
                            onChange={handleChange}
                            placeholder="Re-type Password"
                            className="focus:ring-caramel w-full rounded-md border px-4 py-2 focus:outline-none focus:ring-2"
                        />
                    </div>
                    <div className="col-span-2 flex justify-end">
                        {showPasswordChecker && (
                            <PasswordChecker
                                password={values.password}
                                confirmPassword={values.confirmPassword}
                            />
                        )}
                    </div>
                    <button
                        disabled={loading || Object.keys(errors).length > 0}
                        type="submit"
                        className={`w-full ${loading || Object.keys(errors).length > 0 ? 'pointer-events-none bg-opacity-75' : 'hover:scale-105'} bg-caramel rounded-md py-2 font-semibold text-white transition`}
                    >
                        {loading ? 'Loading...' : 'Sign Up'}
                    </button>
                </form>
                <p className="mt-4 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link href="/login" className="text-caramel font-semibold">
                        Login
                    </Link>
                </p>
                {error ? (
                    <p className="mt-4 text-center text-sm text-red-500">
                        {error}
                    </p>
                ) : null}
            </motion.div>
        </div>
    )
}
