import { Router } from "express";
import {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment,
} from "../controllers/department.controller";
import { verifyToken, authorizeRole } from "../middleware/auth.middleware";

const router = Router();

/**
 * @openapi
 * /api/departments:
 *   get:
 *     tags:
 *       - Departments
 *     summary: Get all departments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of departments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Department'
 *       401:
 *         description: Unauthorized
 */
router.get("/", verifyToken, getAllDepartments);

/**
 * @openapi
 * /api/departments:
 *   post:
 *     tags:
 *       - Departments
 *     summary: Create a new department (Admin Only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DepartmentInput'
 *     responses:
 *       201:
 *         description: Department created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Department'
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post("/", verifyToken, authorizeRole(["Admin"]), createDepartment);

/**
 * @openapi
 * /api/departments/{id}:
 *   get:
 *     tags:
 *       - Departments
 *     summary: Get department by ID
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
 *         description: Department found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Department'
 *       404:
 *         description: Department not found
 */
router.get("/:id", verifyToken, getDepartmentById);

/**
 * @openapi
 * /api/departments/{id}:
 *   put:
 *     tags:
 *       - Departments
 *     summary: Update a department (Admin Only)
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
 *             $ref: '#/components/schemas/DepartmentInput'
 *     responses:
 *       200:
 *         description: Department updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Department'
 *       404:
 *         description: Department not found
 */
router.put("/:id", verifyToken, authorizeRole(["Admin"]), updateDepartment);

/**
 * @openapi
 * /api/departments/{id}:
 *   delete:
 *     tags:
 *       - Departments
 *     summary: Delete a department (Admin Only)
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
 *         description: Department deleted
 *       404:
 *         description: Department not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.delete("/:id", verifyToken, authorizeRole(["Admin"]), deleteDepartment);

export default router;
