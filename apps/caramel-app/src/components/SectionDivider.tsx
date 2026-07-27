'use client'

import { motion, useReducedMotion } from 'framer-motion'

const dividerEase: [number, number, number, number] = [0.22, 1, 0.36, 1]

interface SectionDividerProps {
    // Full Tailwind gradient class strings, passed as literals from the page so
    // the JIT scanner still sees every colour used.
    lineClassName: string
    glowClassName: string
}

// The hairline that wipes in between landing sections. Extracted from
// app/page.tsx so that page can be a server component: framer-motion's
// useReducedMotion is client-only, and the dividers were the only thing forcing
// 'use client' on the whole route once useSearchParams moved out.
export default function SectionDivider({
    lineClassName,
    glowClassName,
}: SectionDividerProps): React.JSX.Element {
    const reduceMotion = useReducedMotion()

    return (
        <motion.div
            aria-hidden="true"
            className="relative h-px"
            initial={reduceMotion ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: '0px 0px -40px 0px' }}
            transition={{ duration: 1.4, ease: dividerEase }}
        >
            <div className={`h-px ${lineClassName}`}></div>
            <div className={`absolute inset-0 h-px ${glowClassName}`}></div>
        </motion.div>
    )
}
