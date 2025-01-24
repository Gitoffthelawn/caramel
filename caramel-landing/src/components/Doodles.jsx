
import {motion} from "framer-motion";

const Doodles = ({  }) => {

    return (
        <>
        <motion.svg
            className="pointer-events-none absolute z-[99] -right-96 lg:-right-32 top-0 lg:top-10
                     -translate-y-1/2 w-[50vw] h-[50vw]"
            viewBox="0 0 200 200"
            fill="none"
        >
            <path
                d="M190,100 C190,160 140,190 100,190 C60,190 10,160 10,100 C10,40 60,10 100,10 C140,10 190,40 190,100Z"
                stroke="#ea6925"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.2"
            />
        </motion.svg>


    <motion.svg
        className="pointer-events-none absolute -left-[40rem] lg:-left-28 z-[99] top-[90vh]
                     -translate-y-1/2 w-[50vw] h-[50vw]"
        viewBox="0 0 200 200"
        fill="none"
    >
        <path
            d="M190,100 C190,160 140,190 100,190 C60,190 10,160 10,100 C10,40 60,10 100,10 C140,10 190,40 190,100Z"
            stroke="#ea6925"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.2"
        />
    </motion.svg>


        </>
)
    ;
};

export default Doodles;
