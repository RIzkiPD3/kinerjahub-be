import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import prisma from "../lib/prisma";

/**
 * GET ALL ROLES BY ORGANIZATION
 */
export const getRolesByOrganization = async (req: AuthRequest, res: Response) => {
    try {
        const organization_id = req.user?.organization_id;

        if (!organization_id) {
            return res.status(401).json({ message: "Unauthorized - Organization not found" });
        }

        const roles = await prisma.role.findMany({
            where: {
                organization_id,
            },
            select: {
                id: true,
                name: true,
            },
        });

        return res.status(200).json(roles);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
