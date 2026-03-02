"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRole = exports.updateRole = exports.createRole = exports.getRoleById = exports.getAllRoles = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
/**
 * GET ALL ROLES
 */
const getAllRoles = async (req, res) => {
    try {
        const organization_id = req.user?.organization_id;
        if (!organization_id) {
            return res.status(401).json({ message: "Unauthorized - Organization not found" });
        }
        const roles = await prisma_1.default.role.findMany({
            where: {
                organization_id,
            },
            select: {
                id: true,
                name: true,
                organization_id: true,
                organization: { select: { id: true, name: true } },
                created_at: true,
                updated_at: true,
            },
        });
        return res.status(200).json(roles);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getAllRoles = getAllRoles;
/**
 * GET ROLE BY ID
 */
const getRoleById = async (req, res) => {
    const { id } = req.params;
    const organization_id = req.user?.organization_id;
    if (!organization_id) {
        return res.status(401).json({ message: "Unauthorized - Organization not found" });
    }
    try {
        const role = await prisma_1.default.role.findFirst({
            where: {
                id: Array.isArray(id) ? id[0] : id,
                organization_id
            },
            select: {
                id: true,
                name: true,
                organization_id: true,
                organization: { select: { id: true, name: true } },
                created_at: true,
                updated_at: true,
            },
        });
        if (!role) {
            return res.status(404).json({ message: "Role not found" });
        }
        return res.status(200).json(role);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getRoleById = getRoleById;
/**
 * CREATE ROLE
 */
const createRole = async (req, res) => {
    const { name } = req.body;
    const organization_id = req.user?.organization_id;
    if (!organization_id) {
        return res.status(401).json({ message: "Unauthorized - Organization not found" });
    }
    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }
    try {
        const role = await prisma_1.default.role.create({
            data: {
                name,
                organization_id,
            },
            select: {
                id: true,
                name: true,
                organization_id: true,
                created_at: true,
            },
        });
        return res.status(201).json(role);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.createRole = createRole;
/**
 * UPDATE ROLE
 */
const updateRole = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const organization_id = req.user?.organization_id;
    if (!organization_id) {
        return res.status(401).json({ message: "Unauthorized - Organization not found" });
    }
    try {
        const existing = await prisma_1.default.role.findFirst({
            where: {
                id: Array.isArray(id) ? id[0] : id,
                organization_id
            }
        });
        if (!existing) {
            return res.status(404).json({ message: "Role not found" });
        }
        // Proteksi: role system "Admin" tidak boleh di-rename
        if (existing.name.toLowerCase() === "admin") {
            return res.status(400).json({
                message: "Role 'Admin' adalah role sistem dan tidak dapat diubah namanya",
            });
        }
        const updated = await prisma_1.default.role.update({
            where: { id: Array.isArray(id) ? id[0] : id },
            data: {
                ...(name && { name }),
            },
            select: {
                id: true,
                name: true,
                organization_id: true,
                updated_at: true,
            },
        });
        return res.status(200).json(updated);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.updateRole = updateRole;
/**
 * DELETE ROLE
 */
const deleteRole = async (req, res) => {
    const { id } = req.params;
    const organization_id = req.user?.organization_id;
    if (!organization_id) {
        return res.status(401).json({ message: "Unauthorized - Organization not found" });
    }
    try {
        const existing = await prisma_1.default.role.findFirst({
            where: {
                id: Array.isArray(id) ? id[0] : id,
                organization_id
            },
            include: {
                // Hitung berapa user yang masih menggunakan role ini
                users: { select: { id: true }, take: 1 },
            },
        });
        if (!existing) {
            return res.status(404).json({ message: "Role not found" });
        }
        // Proteksi: role system "Admin" tidak boleh dihapus
        if (existing.name.toLowerCase() === "admin") {
            return res.status(400).json({
                message: "Role 'Admin' adalah role sistem dan tidak dapat dihapus",
            });
        }
        // Proteksi: role yang masih dipakai user tidak boleh dihapus
        if (existing.users.length > 0) {
            return res.status(400).json({
                message: "Role ini masih digunakan oleh satu atau lebih user. Pindahkan user ke role lain sebelum menghapus.",
            });
        }
        await prisma_1.default.role.delete({
            where: { id: Array.isArray(id) ? id[0] : id }
        });
        return res.status(200).json({ message: "Role deleted successfully" });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.deleteRole = deleteRole;
