import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import prisma from "../lib/prisma";

/**
 * GET ALL DEPARTMENTS
 */
export const getAllDepartments = async (req: AuthRequest, res: Response) => {
    try {
        const organization_id = req.user?.organization_id;
        const { division_id } = req.query;

        if (!organization_id) {
            return res.status(401).json({ message: "Unauthorized - Organization context missing" });
        }

        const departments = await prisma.department.findMany({
            where: {
                organization_id,
                ...(division_id && { division_id: String(division_id) }),
            },
            select: {
                id: true,
                name: true,
                head: true,
                division_id: true,
                organization: { select: { id: true, name: true } },
                division: { select: { id: true, name: true } },
                created_at: true,
                updated_at: true,
            },
        });

        return res.status(200).json(departments);
    } catch (error) {
        console.error("Get all departments error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * GET DEPARTMENT BY ID
 */
export const getDepartmentById = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const organization_id = req.user?.organization_id;

    if (!organization_id) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const department = await prisma.department.findFirst({
            where: {
                id: Array.isArray(id) ? id[0] : id,
                organization_id
            },
            select: {
                id: true,
                name: true,
                head: true,
                division_id: true,
                organization: { select: { id: true, name: true } },
                division: { select: { id: true, name: true } },
                created_at: true,
                updated_at: true,
            },
        });

        if (!department) {
            return res.status(404).json({ message: "Department not found or access denied" });
        }

        return res.status(200).json(department);
    } catch (error) {
        console.error("Get department by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * CREATE DEPARTMENT
 */
export const createDepartment = async (req: AuthRequest, res: Response) => {
    const { name, division_id, head } = req.body;
    const organization_id = req.user?.organization_id;

    if (!organization_id) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    if (!name || !division_id) {
        return res
            .status(400)
            .json({ message: "name and division_id are required" });
    }

    try {
        // Verify division exists and belongs to the same organization
        const division = await prisma.division.findFirst({
            where: {
                id: division_id,
                organization_id
            },
            select: { id: true }
        });

        if (!division) {
            return res.status(400).json({ message: "Invalid division or access denied" });
        }

        const department = await prisma.department.create({
            data: {
                name,
                organization_id,
                division_id,
                head: head || null,
            },
            select: {
                id: true,
                name: true,
                head: true,
                division_id: true,
                created_at: true,
            },
        });

        return res.status(201).json(department);
    } catch (error) {
        console.error("Create department error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * UPDATE DEPARTMENT
 */
export const updateDepartment = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, division_id, head } = req.body;
    const organization_id = req.user?.organization_id;

    if (!organization_id) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const deptId = Array.isArray(id) ? id[0] : id;

    try {
        const existing = await prisma.department.findFirst({
            where: {
                id: deptId,
                organization_id
            }
        });

        if (!existing) {
            return res.status(404).json({ message: "Department not found or access denied" });
        }

        // If division_id is updated, verify it belongs to the same organization
        if (division_id) {
            const division = await prisma.division.findFirst({
                where: {
                    id: division_id,
                    organization_id
                },
                select: { id: true }
            });

            if (!division) {
                return res.status(400).json({ message: "Invalid division or access denied" });
            }
        }

        const updated = await prisma.department.update({
            where: { id: deptId },
            data: {
                ...(name && { name }),
                ...(division_id && { division_id }),
                head: head !== undefined ? (head || null) : undefined,
            },
            select: {
                id: true,
                name: true,
                head: true,
                division_id: true,
                updated_at: true,
            },
        });

        return res.status(200).json(updated);
    } catch (error) {
        console.error("Update department error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * DELETE DEPARTMENT
 */
export const deleteDepartment = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const organization_id = req.user?.organization_id;

    if (!organization_id) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const deptId = Array.isArray(id) ? id[0] : id;

    try {
        const existing = await prisma.department.findFirst({
            where: {
                id: deptId,
                organization_id
            }
        });

        if (!existing) {
            return res.status(404).json({ message: "Department not found or access denied" });
        }

        await prisma.department.delete({
            where: { id: deptId }
        });

        return res.status(200).json({ message: "Department deleted successfully" });
    } catch (error) {
        console.error("Delete department error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
