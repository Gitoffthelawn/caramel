

import {onErrorMiddleware, onNoMatchMiddleware} from "@/lib/middlewares/errorMiddleware";
import {apiResponse} from "@/lib/securityHelpers/apiResponse";
import prisma from "../../../lib/prisma";

async function handler(req, res) {
    try {
        switch (req.method) {
            case 'GET':
                return handleGet(req, res)
            case 'POST':
                return handlePost(req, res)
            default:
                return onNoMatchMiddleware(req, res)
        }
    } catch (error) {
        return onErrorMiddleware(error, req, res)
    }
}

async function handleGet(req, res) {
        try {
            const sources = await prisma.source.findMany({
                where: {
                    status: "ACTIVE",
                },
                include: {
                    coupons: true,
                },
            });

            // Calculate success metrics
            const sourcesWithMetrics = sources.map((src) => {
                const totalUsed = src.coupons.reduce((acc, c) => acc + c.timesUsed, 0);
                // A "fail" is any coupon that's expired
                const totalFail = src.coupons.filter((c) => c.expired).length;

                // successRate = totalUsed / (totalUsed + totalFail) (avoid division by zero)
                const successRate =
                    totalUsed + totalFail === 0
                        ? 0
                        : (totalUsed / (totalUsed + totalFail)) * 100;

                return {
                    id: src.id,
                    source: src.source,
                    websites: src.websites,
                    numberOfCoupons: src.coupons.length,
                    successRate: parseFloat(successRate.toFixed(2)),
                    status: src.status,
                };
            });

            // Sort from best to worst success rate
            sourcesWithMetrics.sort((a, b) => b.successRate - a.successRate);

            return apiResponse(
                req,
                res,
                200,
                'sources',
                sourcesWithMetrics,
            )
        } catch (error) {
            console.error("Error fetching sources:", error);
            return apiResponse(
                req,
                res,
                500,
                'Error fetching sources.',
                null,
            )
        }
}

async function handlePost(req, res) {
    try {
        const { website } = req.body;
        if (!website) {
            return apiResponse(
                req,
                res,
                400,
                'Missing required fields.',
                null,
            )
        }
        //test is it's a valid website URL
        const isValidWebsite = true
        if(!isValidWebsite) {
            return apiResponse(
                req,
                res,
                400,
                'Invalid website URL.',
                null,
            )
        }
        await prisma.source.create({
            data: {
                source: website,
                status: "REQUESTED",
            },
        });
        return apiResponse(
            req,
            res,
            200,
            'Source submission requested successfully!',
        )
    } catch (error) {
        console.error("Error creating source:", error);
        return apiResponse(
            req,
            res,
            500,
            'Error creating source.',
            null,
        )
    }
}

export default handler