"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.getUserById = exports.login = exports.register = exports.getAllUsers = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/**
 * GET ALL USERS
 */
const getAllUsers = async (req, res) => {
    try {
        const users = await prisma_1.default.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                organization_id: true,
                department_id: true,
                role: {
                    select: { id: true, name: true },
                },
                created_at: true,
            },
        });
        return res.status(200).json(users);
    }
    catch (error) {
        console.error("Get all users error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getAllUsers = getAllUsers;
/**
 * REGISTER
 */
const register = async (req, res) => {
    const { email, name, password, organization_name, organization_address, phone_number, } = req.body;
    if (typeof email !== "string" ||
        typeof name !== "string" ||
        typeof password !== "string" ||
        typeof organization_name !== "string" ||
        typeof organization_address !== "string" ||
        typeof phone_number !== "string") {
        return res.status(400).json({ message: "Invalid input" });
    }
    if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
    }
    if (password.length < 8) {
        return res.status(400).json({ message: "Password min 8 characters" });
    }
    try {
        const existing = await prisma_1.default.user.findUnique({
            where: { email },
        });
        if (existing) {
            return res.status(409).json({ message: "Email already registered" });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        const user = await prisma_1.default.$transaction(async (tx) => {
            // 1. Create Organization
            const organization = await tx.organization.create({
                data: {
                    name: organization_name,
                    address: organization_address,
                },
            });
            // 2. Create Default Division
            const division = await tx.division.create({
                data: {
                    name: "Management",
                    organization_id: organization.id,
                },
            });
            // 3. Create Default Department
            const department = await tx.department.create({
                data: {
                    name: "General",
                    organization_id: organization.id,
                    division_id: division.id,
                },
            });
            // 4. Create "Admin" Role
            const role = await tx.role.create({
                data: {
                    name: "Admin",
                    organization_id: organization.id,
                },
            });
            // 5. Create User
            return await tx.user.create({
                data: {
                    email,
                    name,
                    password: hashedPassword,
                    phone_number,
                    organization_id: organization.id,
                    division_id: division.id,
                    department_id: department.id,
                    role_id: role.id,
                },
                include: {
                    role: true,
                    organization: true,
                },
            });
        });
        const { password: _, ...userWithoutPassword } = user;
        return res.status(201).json({
            message: "Register success",
            user: userWithoutPassword,
        });
    }
    catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.register = register;
/**
 * LOGIN
 */
const login = async (req, res) => {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "Email and password are required" });
    }
    const normalizedEmail = email.trim().toLowerCase();
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { email: normalizedEmail },
            include: { role: true },
        });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("JWT_SECRET is not defined in environment variables");
            return res.status(500).json({ message: "Internal server error" });
        }
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role?.name,
        }, jwtSecret, { expiresIn: "1d" });
        const { password: _, ...userWithoutPassword } = user;
        return res.status(200).json({
            message: "Login success",
            data: {
                token,
                user: userWithoutPassword,
            },
        });
    }
    catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.login = login;
/**
 * GET USER BY ID
 */
const getUserById = async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id },
            include: { role: true },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const { password: _, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
    }
    catch (error) {
        console.error("Get user by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getUserById = getUserById;
/**
 * DELETE USER
 */
const deleteUser = async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }
    try {
        // Check if user exists before deleting
        const existing = await prisma_1.default.user.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "User not found" });
        }
        await prisma_1.default.user.delete({
            where: { id },
        });
        return res.status(200).json({ message: "User deleted successfully" });
    }
    catch (error) {
        console.error("Delete user error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.deleteUser = deleteUser;
