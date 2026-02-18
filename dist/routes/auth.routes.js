"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const authRouter = (0, express_1.Router)();
/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a new user
 *     description: Register a new user with email, name, password, organization, department, and role
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *               - password
 *               - organization_id
 *               - department_id
 *               - role_id
 *             properties:
 *               email:
 *                 type: string
 *                 default: user@example.com
 *               name:
 *                 type: string
 *                 default: John Doe
 *               password:
 *                 type: string
 *                 default: password123
 *               organization_id:
 *                 type: integer
 *                 default: 1
 *               department_id:
 *                 type: integer
 *                 default: 1
 *               role_id:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad Request
 *       409:
 *         description: Conflict (Email already exists)
 *       500:
 *         description: Internal Server Error
 */
authRouter.post("/register", auth_controller_1.register);
/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: User login
 *     description: Authenticate user with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 default: user@example.com
 *               password:
 *                 type: string
 *                 default: password123
 *     responses:
 *       200:
 *         description: Login success
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
authRouter.post("/login", auth_controller_1.login);
exports.default = authRouter;
