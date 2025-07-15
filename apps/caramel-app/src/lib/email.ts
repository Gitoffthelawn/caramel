import nodemailer from 'nodemailer'
import type { SendMailOptions } from 'nodemailer'

// Replace with your SMTP credentials
const smtpOptions = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
}

export const sendEmail = async (data: SendMailOptions) => {
    const transporter = nodemailer.createTransport({
        ...smtpOptions,
    })

    return await transporter.sendMail({
        from: {
            name: process.env.SMTP_FROM_NAME || '',
            address: process.env.SMTP_FROM_ADDRESS || '',
        },
        ...data,
    })
}
