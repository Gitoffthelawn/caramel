import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import React, {useContext, useState} from "react";
import { object, ref, string } from 'yup'
import AppHeader from "@/components/AppHeader";

import dynamic from 'next/dynamic'
import {decryptJsonData} from "@/lib/securityHelpers/decryptJsonData";
import {useRouter} from "next/router";
import {toast} from "react-toastify";
import {useFormik} from "formik";
import {ThemeContext} from "@/lib/contexts";
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
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

export default function Signup() {
    const { isDarkMode } = useContext(ThemeContext)
    const router = useRouter()
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
        onSubmit: async ({
                             username,
                             email,
                             password,
                         }) => {
            setLoading(true)
            setError('')
            try {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: username.trim().toLowerCase(),
                        email: email.trim().toLowerCase(),
                        password,
                    }),
                })

                const resData = await response.json()
                const plainObj = decryptJsonData(resData)

                if (response.ok) {
                    await router.push(
                        '/',
                    )
                } else {
                    setError(plainObj.error)
                    toast.error(plainObj.error)
                }
            } catch (error) {
                setError(error.message)
                toast.error(error.message)
            } finally {
                setLoading(false)
            }
        },
    })

    const { handleSubmit, errors, touched, handleChange, handleBlur, values } =
        formik
    return (
        <>
            <AppHeader 
                ogTitle="Caramel | Sign Up" 
                ogDescription="Join Caramel and start enjoying our services. Sign up now!"
                ogUrl="https://grabcaramel.com/signup"
            />
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <ToastContainer theme={isDarkMode ? 'dark' : 'light'}/>
            <motion.div
                className="w-full max-w-md bg-white shadow-lg rounded-lg p-8"
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.5}}
            >
                <h2 className="text-2xl flex gap-2 justify-center font-bold text-caramel text-center mb-6">
                    <div className="my-auto">
                        Create your
                    </div>
                    <Image
                        src="/full-logo.png"
                        alt="logo"
                        height={90}
                        width={90}
                        className="my-auto mt-2"
                    />
                    <div className="my-auto">
                        account
                    </div>
                </h2>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-4">
                    <div>
                        <label className="block text-black text-sm font-medium"> Choose a nickname</label>
                        <input
                            type="text"
                            onBlur={handleBlur}
                            required
                            name={'username'}
                            onChange={handleChange}
                            placeholder="@nickname"
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-caramel"
                        />
                        <div className="h-1 ml-2 pb-2">
                            {errors.username && touched.username && (
                                <div className="text-red-500 text-sm">{errors.username}</div>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-black text-sm font-medium">Email</label>
                        <input
                            onBlur={handleBlur}
                            type="email"
                            name={'email'}
                            required
                            onChange={handleChange}
                            placeholder="Enter your email"
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-caramel"
                        />
                        <div className="h-1 ml-2 pb-2">
                            {errors.email && touched.email && (
                                <div className="text-red-500 text-sm">{errors.email}</div>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-black text-sm font-medium">Password</label>
                        <input
                            onBlur={handleBlur}
                            onClick={() => setShowPasswordChecker(true)}
                            type="password"
                            name={'password'}
                            required
                            onChange={handleChange}
                            placeholder="Create a password"
                            className="w-full mb-2 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-caramel"
                        />
                    </div>
                    <div>
                        <label className="block text-black text-sm font-medium">Re-type Password</label>
                        <input
                            onBlur={handleBlur}
                            onClick={() => setShowPasswordChecker(true)}
                            type="password"
                            name={'confirmPassword'}
                            required
                            onChange={handleChange}
                            placeholder="Re-type Password"
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-caramel"
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
                        className={`w-full ${loading || Object.keys(errors).length > 0 ? "pointer-events-none bg-opacity-75" : "hover:scale-105"}  bg-caramel text-white font-semibold py-2 rounded-md transition`}
                    >
                        {loading ? 'Loading...' : 'Sign Up'}
                    </button>
                </form>
                <p className="text-sm text-gray-600 text-center mt-4">
                    Already have an account?{" "}
                    <Link href="/login" className="text-caramel font-semibold">
                    Login
                    </Link>
                </p>
            </motion.div>
        </div>
        </>
    );
}
