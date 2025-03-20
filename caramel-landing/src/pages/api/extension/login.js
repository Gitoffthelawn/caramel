import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "@prisma/client";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { email, password } = req.body ?? {};
    if (!email || !password) {
        return res.status(400).json({ error: "Missing email or password" });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: email },
        });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = jwt.sign(
            {
                sub: user.id,
                email: user.email,
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        // 4) Return { token, username, image }
        return res.status(200).json({
            token,
            username: user.username,
            image: user.image || null,
        });
    } catch (error) {
        console.error("Remote login error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
