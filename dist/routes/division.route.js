"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const division_controller_1 = require("../controllers/division.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
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
router.get("/", auth_middleware_1.verifyToken, division_controller_1.getAllDivisions);
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
router.post("/", auth_middleware_1.verifyToken, (0, auth_middleware_1.authorizeRole)(["Admin"]), division_controller_1.createDivision);
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
 *           type: integer
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
router.get("/:id", auth_middleware_1.verifyToken, division_controller_1.getDivisionById);
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
 *           type: integer
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
router.put("/:id", auth_middleware_1.verifyToken, (0, auth_middleware_1.authorizeRole)(["Admin"]), division_controller_1.updateDivision);
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
 *           type: integer
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
router.delete("/:id", auth_middleware_1.verifyToken, (0, auth_middleware_1.authorizeRole)(["Admin"]), division_controller_1.deleteDivision);
exports.default = router;
