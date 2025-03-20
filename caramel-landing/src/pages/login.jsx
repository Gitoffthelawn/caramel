import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import React, {useContext, useState} from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { signIn, getSession } from "next-auth/react";
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import {ThemeContext} from "@/lib/contexts";

export default function Login() {
    const router = useRouter();
    const { extension } = router.query; // if extension=true, we're logging in for the extension
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { isDarkMode } = useContext(ThemeContext)

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const result = await signIn("credentials", {
            redirect: false,
            email,
            password,
        });

        if (result?.error) {
            toast.error(result.error || "Login failed!");
            setLoading(false);
            return;
        }

        // On successful sign-in, fetch the session to get user/token details.
        const session = await getSession();

        console.log("session", session);
        console.log("extension", extension);
        console.log("window.opener", window.opener);
        console.log("window.parent", window.parent);
        window.parent.opener.callBackIntegrationCompleted("testing");
        if (extension && window.opener) {
            window.opener.postMessage(
                {
                    token: session?.accessToken || "",
                    username: session?.user?.username || {},
                    image: session?.user?.image || {},
                },
                "*"
            );
            toast.success("Login successful! You can now close this window.");
            setTimeout(() => {
                window.close();
            }, 1500);
        } else {
            toast.success("Login successful!");
            router.push("/");
        }
        setLoading(false);
    };

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <ToastContainer theme={isDarkMode ? 'dark' : 'light'}/>
            <motion.div
                className="w-full max-w-md bg-white shadow-lg rounded-lg p-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className="text-2xl flex gap-2 justify-center font-bold text-caramel text-center mb-6">
                    <div className="my-auto">Sign in to</div>
                    <Image
                        src="/full-logo.png"
                        alt="logo"
                        height={90}
                        width={90}
                        className="my-auto mt-2"
                    />
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-black text-sm font-medium">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-caramel"
                        />
                    </div>

                    <div>
                        <label className="block text-black text-sm font-medium">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-caramel"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-caramel text-white font-semibold py-2 rounded-md hover:scale-105 transition"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <p className="text-sm text-gray-600 text-center mt-4">
                    Don't have an account?{" "}
                    <Link className="text-caramel font-semibold"href="/signup">
                       Sign Up
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
