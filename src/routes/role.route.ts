import { Router } from "express";
import { getRolesByOrganization } from "../controllers/role.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = Router();

/**
 * @openapi
 * /api/roles:
 *   get:
 *     tags:
 *       - Roles
 *     summary: Get all roles for the organization
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 */
router.get("/", verifyToken, getRolesByOrganization);

export default router;
