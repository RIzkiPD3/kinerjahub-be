import { Router } from "express";
import { register } from "../controllers/auth.controller";

const authRouter = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a new user
 *     description: Register a new user with email, name, and password
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
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Internal Server Error
 */
authRouter.post("/register", register);

export default authRouter;
