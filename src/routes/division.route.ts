import { Router } from "express";
import {
    getAllDivisions,
    getDivisionById,
    createDivision,
    updateDivision,
    deleteDivision,
} from "../controllers/division.controller";
import { verifyToken, authorizeRole } from "../middleware/auth.middleware";

const router = Router();

/**
 * @openapi
 * /api/divisions:
 *   get:
 *     tags:
 *       - Divisions
 *     summary: Get all divisions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of divisions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Division'
 *       401:
 *         description: Unauthorized
 */
router.get("/", verifyToken, getAllDivisions);

/**
 * @openapi
 * /api/divisions:
 *   post:
 *     tags:
 *       - Divisions
 *     summary: Create a new division (Admin Only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DivisionInput'
 *     responses:
 *       201:
 *         description: Division created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Division'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post("/", verifyToken, authorizeRole(["Admin"]), createDivision);

/**
 * @openapi
 * /api/divisions/{id}:
 *   get:
 *     tags:
 *       - Divisions
 *     summary: Get division by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Division found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Division'
 *       404:
 *         description: Division not found
 */
router.get("/:id", verifyToken, getDivisionById);

/**
 * @openapi
 * /api/divisions/{id}:
 *   put:
 *     tags:
 *       - Divisions
 *     summary: Update a division (Admin Only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DivisionInput'
 *     responses:
 *       200:
 *         description: Division updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Division'
 *       404:
 *         description: Division not found
 */
router.put("/:id", verifyToken, authorizeRole(["Admin"]), updateDivision);

/**
 * @openapi
 * /api/divisions/{id}:
 *   delete:
 *     tags:
 *       - Divisions
 *     summary: Delete a division (Admin Only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Division deleted
 *       404:
 *         description: Division not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.delete("/:id", verifyToken, authorizeRole(["Admin"]), deleteDivision);

export default router;
