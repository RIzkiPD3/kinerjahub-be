import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import prisma from "../lib/prisma";

/**
 * GET ALL ROLES
 */
export const getAllRoles = async (req: AuthRequest, res: Response) => {
    try {
        const organization_id = req.user?.organization_id;

        if (!organization_id) {
            return res.status(401).json({ message: "Unauthorized - Organization not found" });
        }

        const roles = await prisma.role.findMany({
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
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * GET ROLE BY ID
 */
export const getRoleById = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const organization_id = req.user?.organization_id;

    if (!organization_id) {
        return res.status(401).json({ message: "Unauthorized - Organization not found" });
    }

    try {
        const role = await prisma.role.findFirst({
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
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * CREATE ROLE
 */
export const createRole = async (req: AuthRequest, res: Response) => {
    const { name } = req.body;
    const organization_id = req.user?.organization_id;

    if (!organization_id) {
        return res.status(401).json({ message: "Unauthorized - Organization not found" });
    }

    if (!name) {
        return res.status(400).json({ message: "name is required" });
    }

    try {
        const role = await prisma.role.create({
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
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * UPDATE ROLE
 */
export const updateRole = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;
    const organization_id = req.user?.organization_id;

    if (!organization_id) {
        return res.status(401).json({ message: "Unauthorized - Organization not found" });
    }

    try {
        const existing = await prisma.role.findFirst({
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

        const updated = await prisma.role.update({
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
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * DELETE ROLE
 */
export const deleteRole = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const organization_id = req.user?.organization_id;

    if (!organization_id) {
        return res.status(401).json({ message: "Unauthorized - Organization not found" });
    }

    try {
        const existing = await prisma.role.findFirst({
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

        await prisma.role.delete({
            where: { id: Array.isArray(id) ? id[0] : id }
        });

        return res.status(200).json({ message: "Role deleted successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
