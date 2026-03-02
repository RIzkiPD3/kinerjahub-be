"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const department_controller_1 = require("../controllers/department.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
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
router.get("/", auth_middleware_1.verifyToken, department_controller_1.getAllDepartments);
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
router.post("/", auth_middleware_1.verifyToken, (0, auth_middleware_1.authorizeRole)(["Admin"]), department_controller_1.createDepartment);
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
 *           type: string
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
router.get("/:id", auth_middleware_1.verifyToken, department_controller_1.getDepartmentById);
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
 *           type: string
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
router.put("/:id", auth_middleware_1.verifyToken, (0, auth_middleware_1.authorizeRole)(["Admin"]), department_controller_1.updateDepartment);
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
 *           type: string
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
router.delete("/:id", auth_middleware_1.verifyToken, (0, auth_middleware_1.authorizeRole)(["Admin"]), department_controller_1.deleteDepartment);
exports.default = router;
