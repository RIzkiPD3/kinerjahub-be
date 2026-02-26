import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import prisma from "../lib/prisma";

/**
 * GET ALL DIVISIONS
 */
export const getAllDivisions = async (req: AuthRequest, res: Response) => {
    try {
        const organization_id = req.user?.organization_id;

        if (!organization_id) {
            return res.status(401).json({ message: "Unauthorized - Organization context missing" });
        }

        const divisions = await prisma.division.findMany({
            where: {
                organization_id,
            },
            select: {
                id: true,
                name: true,
                head: true,
                description: true,
                organization_id: true,
                organization: { select: { id: true, name: true } },
                created_at: true,
                updated_at: true,
            },
        });

        return res.status(200).json(divisions);
    } catch (error) {
        console.error("Get all divisions error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * GET DIVISION BY ID
 */
export const getDivisionById = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const organization_id = req.user?.organization_id;

    if (!organization_id) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const division = await prisma.division.findFirst({
            where: {
                id: Array.isArray(id) ? id[0] : id,
                organization_id,
            },
            select: {
                id: true,
                name: true,
                head: true,
                description: true,
                organization_id: true,
                organization: { select: { id: true, name: true } },
                departments: { select: { id: true, name: true } },
                created_at: true,
                updated_at: true,
            },
        });

        if (!division) {
            return res.status(404).json({ message: "Division not found or access denied" });
        }

        return res.status(200).json(division);
    } catch (error) {
        console.error("Get division by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * CREATE DIVISION
 */
export const createDivision = async (req: AuthRequest, res: Response) => {
    const { name, head, description } = req.body;
    const organization_id = req.user?.organization_id;

    if (!organization_id) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    if (!name) {
        return res.status(400).json({ message: "Division name is required" });
    }

    try {
        const division = await prisma.division.create({
            data: {
                name,
                head,
                description,
                organization_id,
            },
            select: {
                id: true,
                name: true,
                head: true,
                description: true,
                organization_id: true,
                created_at: true,
            },
        });

        return res.status(201).json(division);
    } catch (error) {
        console.error("Create division error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * UPDATE DIVISION
 */
export const updateDivision = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, head, description } = req.body;
    const organization_id = req.user?.organization_id;

    if (!organization_id) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const divisionId = Array.isArray(id) ? id[0] : id;

    try {
        const existing = await prisma.division.findFirst({
            where: {
                id: divisionId,
                organization_id,
            }
        });

        if (!existing) {
            return res.status(404).json({ message: "Division not found or access denied" });
        }

        const updated = await prisma.division.update({
            where: { id: divisionId },
            data: {
                ...(name && { name }),
                ...(head !== undefined && { head }),
                ...(description !== undefined && { description }),
            },
            select: {
                id: true,
                name: true,
                head: true,
                description: true,
                organization_id: true,
                updated_at: true,
            },
        });

        return res.status(200).json(updated);
    } catch (error) {
        console.error("Update division error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * DELETE DIVISION
 */
export const deleteDivision = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const organization_id = req.user?.organization_id;

    if (!organization_id) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const divisionId = Array.isArray(id) ? id[0] : id;

    try {
        const existing = await prisma.division.findFirst({
            where: {
                id: divisionId,
                organization_id,
            }
        });

        if (!existing) {
            return res.status(404).json({ message: "Division not found or access denied" });
        }

        // Check for child departments before deleting
        const departmentsCount = await prisma.department.count({
            where: { division_id: divisionId }
        });

        if (departmentsCount > 0) {
            return res.status(400).json({
                message: "Cannot delete division that has associated departments. Please delete or move departments first."
            });
        }

        await prisma.division.delete({
            where: { id: divisionId }
        });

        return res.status(200).json({ message: "Division deleted successfully" });
    } catch (error) {
        console.error("Delete division error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
