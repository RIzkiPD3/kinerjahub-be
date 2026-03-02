"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withOrg = exports.sendOrgUnauthorized = exports.getOrgId = void 0;
/**
 * Gets the organization_id from the authenticated request.
 * Throws an error or returns null if not found.
 */
const getOrgId = (req) => {
    return req.user?.organization_id || null;
};
exports.getOrgId = getOrgId;
/**
 * Standard response for unauthorized organization access.
 */
const sendOrgUnauthorized = (res) => {
    return res.status(401).json({ message: "Unauthorized - Organization context missing" });
};
exports.sendOrgUnauthorized = sendOrgUnauthorized;
/**
 * Helper to construct a Prisma 'where' clause that enforces organization isolation.
 */
const withOrg = (req, otherFilters = {}) => {
    const orgId = (0, exports.getOrgId)(req);
    if (!orgId)
        return null;
    return {
        ...otherFilters,
        organization_id: orgId,
    };
};
exports.withOrg = withOrg;
