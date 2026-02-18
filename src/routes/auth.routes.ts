import { Router } from "express";
import { register, login } from "../controllers/auth.controller";

const authRouter = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a new user
 *     description: Register a new user with email, name, password, organization name/address, and user phone number
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
 *               - organization_name
 *               - organization_address
 *               - phone_number
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
 *               organization_name:
 *                 type: string
 *                 default: Example Corp
 *               organization_address:
 *                 type: string
 *                 default: 123 Main St, Jakarta
 *               phone_number:
 *                 type: string
 *                 default: +62 812-3456-7890
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
authRouter.post("/register", register);

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
authRouter.post("/login", login);

export default authRouter;
