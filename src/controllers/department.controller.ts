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
    const { id } = req.params;

    try {
        const department = await prisma.department.findUnique({
            where: { id: Array.isArray(id) ? id[0] : id },
            select: {
                id: true,
                name: true,
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
    const { name, division_id } = req.body;

    if (!name || !division_id) {
        return res
            .status(400)
            .json({ message: "name and division_id are required" });
    }

    try {
        // Derive organization_id from division
        const division = await prisma.division.findUnique({
            where: { id: division_id },
            select: { organization_id: true }
        });

        if (!division) {
            return res.status(404).json({ message: "Division not found" });
        }

        const department = await prisma.department.create({
            data: {
                name,
                organization_id: division.organization_id,
                division_id: division_id,
            },
            select: {
                id: true,
                name: true,
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
    const { id } = req.params;
    const { name, division_id } = req.body;

    try {
        const existing = await prisma.department.findUnique({
            where: { id: Array.isArray(id) ? id[0] : id }
        });

        if (!existing) {
            return res.status(404).json({ message: "Department not found" });
        }

        let organization_id = undefined;
        if (division_id) {
            const division = await prisma.division.findUnique({
                where: { id: division_id },
                select: { organization_id: true }
            });

            if (!division) {
                return res.status(404).json({ message: "Division not found" });
            }
            organization_id = division.organization_id;
        }

        const updated = await prisma.department.update({
            where: { id: Array.isArray(id) ? id[0] : id },
            data: {
                ...(name && { name }),
                ...(division_id && {
                    division_id: division_id,
                    organization_id: organization_id
                }),
            },
            select: {
                id: true,
                name: true,
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
    const { id } = req.params;

    try {
        const existing = await prisma.department.findUnique({
            where: { id: Array.isArray(id) ? id[0] : id }
        });

        if (!existing) {
            return res.status(404).json({ message: "Department not found" });
        }

        await prisma.department.delete({
            where: { id: Array.isArray(id) ? id[0] : id }
        });

        return res.status(200).json({ message: "Department deleted successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
