"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../lib/prisma"));
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10;
const register = async (req, res) => {
    const { email, name, password, organization_id, department_id, role_id } = req.body;
    if (typeof email !== "string" ||
        typeof name !== "string" ||
        typeof password !== "string" ||
        typeof organization_id !== "number" ||
        typeof department_id !== "number" ||
        typeof role_id !== "number") {
        return res.status(400).json({
            message: "Email, name, password, organization_id, department_id, and role_id are required",
        });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({
            message: "Invalid email format",
        });
    }
    if (trimmedName.length === 0) {
        return res.status(400).json({
            message: "Name cannot be empty",
        });
    }
    if (password.length < 8) {
        return res.status(400).json({
            message: "Password must be at least 8 characters",
        });
    }
    try {
        const existingUser = await prisma_1.default.user.findUnique({
            where: {
                email: normalizedEmail,
            },
        });
        if (existingUser) {
            return res.status(409).json({
                message: "Email is already registered",
            });
        }
        const passwordHash = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        const user = await prisma_1.default.user.create({
            data: {
                email: normalizedEmail,
                name: trimmedName,
                password: passwordHash,
                organization_id,
                department_id,
                role_id,
            },
            select: {
                id: true,
                email: true,
                name: true,
                organization_id: true,
                department_id: true,
                role_id: true,
                created_at: true,
                updated_at: true,
            },
        });
        return res.status(201).json({
            message: "Register success",
            data: user,
        });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                return res.status(409).json({
                    message: "Email is already registered",
                });
            }
            if (error.code === "P2003") {
                return res.status(400).json({
                    message: "Invalid organization_id, department_id, or role_id",
                });
            }
        }
        console.error("Register error:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};
exports.register = register;
const login = async (req, res) => {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({
            message: "Email and password are required",
        });
    }
    const normalizedEmail = email.trim().toLowerCase();
    try {
        const user = await prisma_1.default.user.findUnique({
            where: {
                email: normalizedEmail,
            },
        });
        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userWithoutPassword } = user;
        return res.status(200).json({
            message: "Login success",
            data: userWithoutPassword,
        });
    }
    catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};
exports.login = login;
