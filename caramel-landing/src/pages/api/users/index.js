import { render } from '@react-email/render'
import bcrypt from 'bcryptjs'
import { NextApiRequest, NextApiResponse } from 'next'
import {onErrorMiddleware, onNoMatchMiddleware} from "../../../lib/middlewares/errorMiddleware";
import {apiResponse} from "../../../lib/securityHelpers/apiResponse";
import prisma from "../../../lib/prisma";
import {sendEmail} from "../../../lib/email";
import VerificationRequestTemplate from "../../../../emails/VerificationRequestTemplate";

async function handler(req, res) {
    try {
        switch (req.method) {
            case 'POST':
                return handlePost(req, res)
            default:
                return onNoMatchMiddleware(req, res)
        }
    } catch (error) {
        return onErrorMiddleware(error, req, res)
    }
}

async function handlePost(req, res) {
    const { username, email, password } = req.body

    if (!email || !password || !username) {
        return apiResponse(
            req,
            res,
            400,
            'Missing required fields',
            null,
            'Missing required fields',
        )
    }

    try {
        const hashedPassword = bcrypt.hashSync(
            password,
            Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
        )
        const emailInput = email.trim().toLowerCase()

        // Check for existing user by email
        const existingUser = await prisma.user.findUnique({
            where: { email: emailInput },
        })
        if (existingUser) {
            return apiResponse(
                req,
                res,
                400,
                'Email already exists',
                null,
                'Email already exists',
            )
        }

        // Check for existing user by username
        const existingUsername = await prisma.user.findUnique({
            where: { username },
        })
        if (existingUsername) {
            return apiResponse(
                req,
                res,
                400,
                'Username already exists',
                null,
                'Username already exists',
            )
        }

        // Create verification token
        const verificationToken =
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15)

        // Create the user
        await prisma.user.create({
            data: {
                username,
                email: emailInput,
                password: hashedPassword,
                token: verificationToken,
                tokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
            },
        })

        // Send verification email
        await sendEmail({
            to: email,
            subject: 'Verify your email for Caramel',
            html: render(
                VerificationRequestTemplate({
                    token: verificationToken,
                }),
            ),
        })

        return apiResponse(req, res, 200, 'User created successfully')
    } catch (error) {
        return apiResponse(
            req,
            res,
            500,
            'Error creating user',
            null,
            error.message,
        )
    }
}

export default handler
