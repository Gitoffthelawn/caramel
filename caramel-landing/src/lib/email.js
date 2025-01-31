import { env } from '@/env.mjs'
import nodemailer from 'nodemailer'

type EmailPayload = {
    to: string
    subject: string
    html: string
}

// Replace with your SMTP credentials
const smtpOptions = {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
    },
}

export const sendEmail = async (data: EmailPayload) => {
    const transporter = nodemailer.createTransport({
        ...smtpOptions,
    })

    return await transporter.sendMail({
        from: {
            name: env.SMTP_FROM_NAME!,
            address: env.SMTP_FROM_ADDRESS!,
        },
        ...data,
    })
}
