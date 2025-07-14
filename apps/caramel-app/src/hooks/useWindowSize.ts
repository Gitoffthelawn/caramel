import { useEffect, useState } from 'react'

export const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState<number>(0)
    useEffect(() => {
        const handleResize = () => setWindowSize(() => window.innerWidth)

        window.addEventListener('resize', handleResize)
        handleResize()
        return () => window.removeEventListener('resize', handleResize)
    }, [])
    return { windowSize, isMobile: windowSize && windowSize < 640 }
}
