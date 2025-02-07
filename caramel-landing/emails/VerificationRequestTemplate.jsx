const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL

export default function VerificationRequestTemplate({
    token,
}) {
    return (
        <div style={{ background: '#ea6925', padding: '20px' }}>
            <div
                style={{
                    background: '#ffffff',
                    padding: '40px',
                    borderRadius: '10px',
                    boxShadow: '0px 0px 10px rgba(0,0,0,0.1)',
                }}
            >
                <h1
                    style={{
                        color: '#333333',
                        fontSize: '36px',
                        fontWeight: 'bold',
                        marginBottom: '40px',
                        textAlign: 'center',
                    }}
                >
                    Welcome to Caramel!
                </h1>
                <p
                    style={{
                        color: '#666666',
                        fontSize: '18px',
                        lineHeight: '28px',
                        marginBottom: '40px',
                    }}
                >
                    {' '}
                    To verify your email address, please click the link below:
                </p>
                <a
                    href={`${BASE_URL}/api/auth/verify/${token}`}
                    style={{
                        padding: '20px',
                    }}
                >
                    {`${BASE_URL}/api/auth/verify/${token}`}
                </a>
            </div>
        </div>
    )
}
