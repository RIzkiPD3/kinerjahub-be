import { Request, Response } from "express";
import prisma from "../lib/prisma";

/**
 * GET ALL DEPARTMENTS
 */
export const getAllDepartments = async (req: Request, res: Response) => {
    try {
        const departments = await prisma.department.findMany({
            select: {
                id: true,
                name: true,
                organization_id: true,
                division_id: true,
                organization: { select: { id: true, name: true } },
                division: { select: { id: true, name: true } },
                created_at: true,
                updated_at: true,
            },
        });

        return res.status(200).json(departments);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * GET DEPARTMENT BY ID
 */
export const getDepartmentById = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
        const department = await prisma.department.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                organization_id: true,
                division_id: true,
                organization: { select: { id: true, name: true } },
                division: { select: { id: true, name: true } },
                created_at: true,
                updated_at: true,
            },
        });

        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }

        return res.status(200).json(department);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * CREATE DEPARTMENT
 */
export const createDepartment = async (req: Request, res: Response) => {
    const { name, organization_id, division_id } = req.body;

    if (!name || !organization_id || !division_id) {
        return res
            .status(400)
            .json({ message: "name, organization_id, and division_id are required" });
    }

    try {
        const department = await prisma.department.create({
            data: {
                name,
                organization_id: Number(organization_id),
                division_id: Number(division_id),
            },
            select: {
                id: true,
                name: true,
                organization_id: true,
                division_id: true,
                created_at: true,
            },
        });

        return res.status(201).json(department);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * UPDATE DEPARTMENT
 */
export const updateDepartment = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { name, organization_id, division_id } = req.body;

    try {
        const existing = await prisma.department.findUnique({ where: { id } });

        if (!existing) {
            return res.status(404).json({ message: "Department not found" });
        }

        const updated = await prisma.department.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(organization_id && { organization_id: Number(organization_id) }),
                ...(division_id && { division_id: Number(division_id) }),
            },
            select: {
                id: true,
                name: true,
                organization_id: true,
                division_id: true,
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
 * DELETE DEPARTMENT
 */
export const deleteDepartment = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
        const existing = await prisma.department.findUnique({ where: { id } });

        if (!existing) {
            return res.status(404).json({ message: "Department not found" });
        }

        await prisma.department.delete({ where: { id } });

        return res.status(200).json({ message: "Department deleted successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
