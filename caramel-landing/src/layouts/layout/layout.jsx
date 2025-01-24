import { Inter } from "next/font/google";
import React from "react";
import {ThemeProvider} from "@/context/ThemeContext";
import Header from "@/layouts/Header/Header";
import Footer from "@/layouts/Footer/Footer";

const inter = Inter({ subsets: ["latin"] });


export default function RootLayout({ children }) {
  return (
      <div className={"h-screen bg-gray-50"}>
    <ThemeProvider>
          <Header />
          {children}
          <Footer />
      </ThemeProvider>
      </div>
  );
}
