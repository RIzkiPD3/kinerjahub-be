import { AuthRequest } from "../middleware/auth.middleware";
import { Response } from "express";

/**
 * Gets the organization_id from the authenticated request.
 * Throws an error or returns null if not found.
 */
export const getOrgId = (req: AuthRequest): string | null => {
    return req.user?.organization_id || null;
};

/**
 * Standard response for unauthorized organization access.
 */
export const sendOrgUnauthorized = (res: Response) => {
    return res.status(401).json({ message: "Unauthorized - Organization context missing" });
};

/**
 * Helper to construct a Prisma 'where' clause that enforces organization isolation.
 */
export const withOrg = (req: AuthRequest, otherFilters: object = {}) => {
    const orgId = getOrgId(req);
    if (!orgId) return null;

    return {
        ...otherFilters,
        organization_id: orgId,
    };
};
