const PasswordItem = ({ itemChecker }) => {
    return (
        <>
            <div
                className={`rounded-full fill-current p-1 ${
                    itemChecker.term
                        ? 'bg-green-200 text-green-700'
                        : 'bg-red-200 text-red-700'
                } `}
            >
                <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        visibility={itemChecker.term ? 'visible' : 'hidden'}
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                    />
                    <path
                        visibility={!itemChecker.term ? 'visible' : 'hidden'}
                        d="M6 18L18 6M6 6l12 12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                    />
                </svg>
            </div>
            <span
                className={`ml-3 text-sm font-medium ${
                    itemChecker.term ? 'text-green-700' : 'text-red-700'
                } `}
            >
                {itemChecker.term
                    ? itemChecker.success_message
                    : itemChecker.failure_message}
            </span>
        </>
    )
}
export default PasswordItem
