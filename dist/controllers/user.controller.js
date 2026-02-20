"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const SALT_ROUNDS = 10;
/**
 * GET ALL USERS (Admin Only)
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
                    select: {
                        id: true,
                        name: true,
                    },
                },
                created_at: true,
            },
        });
        return res.status(200).json(users);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getAllUsers = getAllUsers;
/**
 * GET USER BY ID
 */
const getUserById = async (req, res) => {
    const id = Number(req.params.id);
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                organization_id: true,
                department_id: true,
                role: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json(user);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getUserById = getUserById;
/**
 * CREATE USER (Admin Only)
 */
const createUser = async (req, res) => {
    const { name, email, password, phone_number, organization_id, department_id, division_id, role_id, } = req.body;
    try {
        const existing = await prisma_1.default.user.findUnique({
            where: { email },
        });
        if (existing) {
            return res.status(409).json({ message: "Email already exists" });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        const user = await prisma_1.default.user.create({
            data: {
                name,
                email,
                phone_number,
                password: hashedPassword,
                organization_id,
                department_id,
                division_id,
                role_id,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role_id: true,
            },
        });
        return res.status(201).json(user);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.createUser = createUser;
/**
 * UPDATE USER
 */
const updateUser = async (req, res) => {
    const id = Number(req.params.id);
    const { name, email, password, role_id } = req.body;
    try {
        const existing = await prisma_1.default.user.findUnique({
            where: { id },
        });
        if (!existing) {
            return res.status(404).json({ message: "User not found" });
        }
        let hashedPassword = existing.password;
        if (password) {
            hashedPassword = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        }
        const updated = await prisma_1.default.user.update({
            where: { id },
            data: {
                name,
                email,
                password: hashedPassword,
                role_id,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role_id: true,
            },
        });
        return res.status(200).json(updated);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.updateUser = updateUser;
/**
 * DELETE USER (Admin Only)
 */
const deleteUser = async (req, res) => {
    const id = Number(req.params.id);
    try {
        await prisma_1.default.user.delete({
            where: { id },
        });
        return res.status(200).json({ message: "User deleted successfully" });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.deleteUser = deleteUser;
