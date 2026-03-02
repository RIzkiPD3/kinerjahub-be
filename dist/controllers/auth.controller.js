"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.getUserById = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
    // BUG FIX: Normalize email to lowercase sebelum disimpan,
    // agar konsisten dengan proses login yang juga normalize ke lowercase.
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({ message: "Invalid email format" });
    }
    if (password.length < 8) {
        return res.status(400).json({ message: "Password min 8 characters" });
    }
    try {
        const existing = await prisma_1.default.user.findUnique({
            where: { email: normalizedEmail },
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
            // 5. Create User (gunakan normalizedEmail, bukan raw email)
            return await tx.user.create({
                data: {
                    email: normalizedEmail,
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
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error("JWT_SECRET is not defined");
        }
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role?.name, // nama role untuk authorizeRole (case-insensitive)
            role_id: user.role_id, // UUID role untuk forward-compatibility
            organization_id: user.organization_id,
            department_id: user.department_id,
        }, jwtSecret, { expiresIn: "1d" });
        const { password: _, ...userWithoutPassword } = user;
        return res.status(201).json({
            message: "Register success",
            data: {
                token,
                user: userWithoutPassword,
            },
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
    console.log("[LOGIN] Attempting login for email:", normalizedEmail);
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { email: normalizedEmail },
            include: { role: true },
        });
        // [DEBUG LOG] Cek apakah user ditemukan di database
        console.log("[LOGIN] User found in DB:", user ? `YES (id: ${user.id})` : "NO - user not found");
        if (!user) {
            console.warn("[LOGIN] 401 triggered: user not found for email:", normalizedEmail);
            return res.status(401).json({ message: "Invalid email or password" });
        }
        // [DEBUG LOG] Pastikan password di DB ada dan tidak kosong
        console.log("[LOGIN] User password hash exists:", !!user.password, "| Hash prefix:", user.password?.substring(0, 7));
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        // [DEBUG LOG] Cek hasil bcrypt.compare
        console.log("[LOGIN] bcrypt.compare result:", isPasswordValid);
        if (!isPasswordValid) {
            console.warn("[LOGIN] 401 triggered: password mismatch for user id:", user.id);
            return res.status(401).json({ message: "Invalid email or password" });
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("[LOGIN] JWT_SECRET is not defined in environment variables");
            return res.status(500).json({ message: "Internal server error" });
        }
        // [DEBUG LOG] JWT akan di-generate
        console.log("[LOGIN] Generating JWT for user id:", user.id, "role:", user.role?.name);
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role?.name, // nama role untuk authorizeRole (case-insensitive)
            role_id: user.role_id, // UUID role untuk forward-compatibility
            organization_id: user.organization_id,
            department_id: user.department_id,
        }, jwtSecret, { expiresIn: "1d" });
        console.log("[LOGIN] Login successful for user id:", user.id);
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
        console.error("[LOGIN] Unexpected login error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.login = login;
/**
 * GET USER BY ID
 */
const getUserById = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: "Invalid user ID" });
    }
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id: Array.isArray(id) ? id[0] : id },
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
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: "Invalid user ID" });
    }
    try {
        // Check if user exists before deleting
        const existing = await prisma_1.default.user.findUnique({
            where: { id: Array.isArray(id) ? id[0] : id },
        });
        if (!existing) {
            return res.status(404).json({ message: "User not found" });
        }
        await prisma_1.default.user.delete({
            where: { id: Array.isArray(id) ? id[0] : id },
        });
        return res.status(200).json({ message: "User deleted successfully" });
    }
    catch (error) {
        console.error("Delete user error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.deleteUser = deleteUser;
