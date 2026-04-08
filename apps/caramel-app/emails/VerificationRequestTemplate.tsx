import EmailLayout, { EmailButton, EmailNotice, text } from './EmailLayout'

interface VerificationEmailProps {
    url: string
}

export default function VerificationRequestTemplate({
    url,
}: VerificationEmailProps) {
    return (
        <EmailLayout previewText="Verify your email to get started with Caramel">
            <h1 style={text.heading}>Welcome to Caramel!</h1>
            <p style={text.body}>
                Thanks for signing up. To start discovering sweet deals, verify
                your email address by clicking the button below.
            </p>

            <EmailButton href={url}>Verify Email Address</EmailButton>

            <EmailNotice>
                This verification link expires in <strong>1 hour</strong>. If
                you didn&apos;t create a Caramel account, you can safely ignore
                this email.
            </EmailNotice>

            <div style={text.divider} />

            <p style={text.small}>
                If the button doesn&apos;t work, copy and paste this link into
                your browser:
            </p>
            <p
                style={{
                    ...text.small,
                    wordBreak: 'break-all' as const,
                    color: '#ea6925',
                    marginTop: '6px',
                }}
            >
                {url}
            </p>
        </EmailLayout>
    )
}
