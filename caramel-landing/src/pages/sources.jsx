"use client";
import React, {useContext, useEffect, useState} from "react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { decryptJsonData } from "@/lib/securityHelpers/decryptJsonData";
import Doodles from "@/components/Doodles";

// Recharts imports for the graph.
import {
    ComposedChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Bar,
    Line,
    ResponsiveContainer,
} from "recharts";
import {ThemeContext} from "@/lib/contexts";

export default function SourcesPage() {
    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [websitesInput, setWebsitesInput] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const { isDarkMode } = useContext(ThemeContext)
    // Fetch data from the API.
    const fetchSources = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/sources");
            const data = await res.json();
            const plainObj = await decryptJsonData(data);
            setSources(plainObj.data);
        } catch (error) {
            console.error("Error fetching sources:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSources();
    }, []);

    // URL validation helper.
    const isValidUrl = (url) => {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    };

    // Handle the form submission for new sources.
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!websitesInput) return;

        if (!isValidUrl(websitesInput)) {
            return toast.error("Invalid URL. Please enter a valid URL.");
        }

        try {
            const res = await fetch("/api/sources", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ website: websitesInput }),
            });

            if (res.ok) {
                toast.info("Source submission requested successfully!");
                setWebsitesInput("");
                setShowModal(false);
                fetchSources();
            } else {
                const { error } = await res.json();
                toast.error("Error: " + (error || "Something went wrong."));
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred while requesting a new source.");
        }
    };

    // Filter the sources based on the search term.
    const filteredSources = sources.filter((src) =>
        src.source.toLowerCase().includes(searchTerm.toLowerCase()) || src.websites.join(" ").toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Prepare the chart data (force coupons to be an integer).
    const chartData = filteredSources.map((src) => ({
        name: src.source,
        coupons: parseInt(src.numberOfCoupons, 10), // fixed integer value
        successRate: parseFloat(src.successRate), // already fixed to 2 decimals
    }));
    return (
        <main className="min-h-screen relative overflow-x-clip dark:bg-transparent dark:text-gray-50 bg-gray-50 text-gray-800 p-6">
            <Doodles />
            <motion.h1
                className="text-4xl font-bold text-caramel mb-4 text-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                Sources
            </motion.h1>

            {/* Modal Popup for Adding a New Source */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
                    <motion.div
                        className="bg-white dark:bg-darkerBg p-6 rounded-lg shadow relative md:w-11/12 w-1/3"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <button
                            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                            onClick={() => setShowModal(false)}
                        >
                            X
                        </button>
                        <h2 className="text-2xl font-semibold mb-3 dark:text-white text-black">
                            Submit a New Source
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                            Submit a new website or aggregator from which we can get coupons!
                            Help Caramel grow.
                        </p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium dark:text-white text-black">
                                    Website URL
                                </label>
                                <input
                                    type="text"
                                    placeholder="https://"
                                    value={websitesInput}
                                    onChange={(e) => setWebsitesInput(e.target.value)}
                                    className="w-full mt-1 p-2 border text-black border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-caramel"
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    className="bg-gray-500 text-white px-4 py-2 rounded hover:scale-105 transform transition"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-caramel text-white px-4 py-2 rounded font-semibold hover:scale-105 transform transition"
                                >
                                    Submit
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Section: Table and Graph */}
            <section className="max-w-6xl mx-auto mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold dark:text-white text-black">
                        Caramel coupon sources
                    </h2>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-caramel text-white px-4 py-2 rounded font-semibold hover:scale-105 transform transition"
                    >
                        Add New Source
                    </button>
                </div>

                {/* Search Field */}
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search sources, websites..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full text-black p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-caramel"
                    />
                </div>

                {/* Responsive grid: table on one side and graph on the other */}
                <div className="grid grid-cols-1 gap-6">
                    {/* Styled Table */}
                    <div className="bg-white dark:bg-darkerBg p-6 rounded-lg shadow overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                            <tr className="bg-gray-100 text-black dark:text-white dark:bg-darkBg">
                                <th className="py-2 px-4">Source</th>
                                <th className="py-2 px-4">Websites</th>
                                <th className="py-2 px-4">Coupons</th>
                                <th className="py-2 px-4">Success Rate</th>
                                <th className="py-2 px-4">Status</th>
                            </tr>
                            </thead>
                            <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="py-4 text-center dark:text-gray-300 text-gray-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : filteredSources.length > 0 ? (
                                filteredSources.map((src) => (
                                    <tr key={src.id} className="border-b dark:hover:bg-darkBg/50 hover:bg-gray-50">
                                        <td className="py-2 px-4">{src.source}</td>
                                        <td className="py-2 px-4">{src.websites.join(", ")}</td>
                                        <td className="py-2 px-4">{parseInt(src.numberOfCoupons, 10)}</td>
                                        <td className="py-2 px-4">{src.successRate}%</td>
                                        <td className="py-2 px-4">
                                            <div className="w-5 h-5 bg-green-500 rounded-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="py-4 text-center text-gray-500">
                                        No sources found.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* Graph */}
                    <div className="bg-white dark:bg-darkerBg p-6 rounded-lg shadow">
                        <div className="w-full h-96">
                            {loading ? (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    Loading graph...
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData}>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke={isDarkMode ? "#444" : "#ccc"}
                                        />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fill: isDarkMode ? "#fff" : "#000" }}
                                            style={{ fontSize: "12px" }}
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            tick={{ fill: isDarkMode ? "#fff" : "#000" }}
                                            label={{
                                                value: "Coupons",
                                                angle: -90,
                                                position: "insideLeft",
                                                fill: isDarkMode ? "#fff" : "#000",
                                            }}
                                        />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            tick={{ fill: isDarkMode ? "#fff" : "#000" }}
                                            label={{
                                                value: "Success Rate (%)",
                                                angle: 90,
                                                position: "insideRight",
                                                fill: isDarkMode ? "#fff" : "#000",
                                            }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: isDarkMode ? "#333" : "#fff",
                                                borderColor: isDarkMode ? "#444" : "#ccc",
                                                color: isDarkMode ? "#fff" : "#000",
                                            }}
                                        />
                                        <Legend wrapperStyle={{ color: isDarkMode ? "#fff" : "#000" }} />
                                        <Bar yAxisId="left" dataKey="coupons" fill="#ea6925" />
                                        <Line yAxisId="right" type="monotone" dataKey="successRate" stroke="#82ca9d" />
                                    </ComposedChart>
                                </ResponsiveContainer>

                            )}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
