import prisma from '@/lib/prisma'

export default async function handler(
    req,
    res,
) {
    const { token } = req.query
    if (!token) {
        return res.status(400).json({ error: "Token is required" });
    }
    console.log("_________________________")
    console.log(`'${token}'`)
    console.log("user")
    const user = await prisma.user.findUnique({
        where: {
            token: token,
        },
    })
    console.log("user")
    console.log(user)
    console.log("user")
    res.redirect('/login')
}
