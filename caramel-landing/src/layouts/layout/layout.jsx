import React, {useContext, useRef} from "react";
import Header from "@/layouts/Header/Header";
import Footer from "@/layouts/Footer/Footer";
import {ThemeContext} from "@/lib/contexts";
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'


export default function layout({ children }) {
    const { isDarkMode } = useContext(ThemeContext)
    const ref = useRef(null)
  return (
      <div
            ref={ref}
          className={`overflow-x-hidden h-screen ${
              isDarkMode ? 'dark bg-darkBg' : 'light bg-gray-50'
          } font-Roboto`}
      >
          <ToastContainer theme={isDarkMode ? 'dark' : 'light'}/>
              <Header scrollRef={ref}/>
              {children}
              <Footer/>
      </div>
      );
      }
