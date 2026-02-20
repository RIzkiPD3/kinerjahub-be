import { Request, Response } from "express";
import prisma from "../lib/prisma";

/**
 * GET ALL DIVISIONS
 */
export const getAllDivisions = async (req: Request, res: Response) => {
    try {
        const divisions = await prisma.division.findMany({
            select: {
                id: true,
                name: true,
                organization_id: true,
                organization: { select: { id: true, name: true } },
                created_at: true,
                updated_at: true,
            },
        });

        return res.status(200).json(divisions);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * GET DIVISION BY ID
 */
export const getDivisionById = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const division = await prisma.division.findUnique({
            where: { id: Array.isArray(id) ? id[0] : id },
            select: {
                id: true,
                name: true,
                organization_id: true,
                organization: { select: { id: true, name: true } },
                departments: { select: { id: true, name: true } },
                created_at: true,
                updated_at: true,
            },
        });

        if (!division) {
            return res.status(404).json({ message: "Division not found" });
        }

        return res.status(200).json(division);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * CREATE DIVISION
 */
export const createDivision = async (req: Request, res: Response) => {
    const { name, organization_id } = req.body;

    if (!name || !organization_id) {
        return res
            .status(400)
            .json({ message: "name and organization_id are required" });
    }

    try {
        const division = await prisma.division.create({
            data: {
                name,
                organization_id: organization_id,
            },
            select: {
                id: true,
                name: true,
                organization_id: true,
                created_at: true,
            },
        });

        return res.status(201).json(division);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * UPDATE DIVISION
 */
export const updateDivision = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, organization_id } = req.body;

    try {
        const existing = await prisma.division.findUnique({
            where: { id: Array.isArray(id) ? id[0] : id }
        });

        if (!existing) {
            return res.status(404).json({ message: "Division not found" });
        }

        const updated = await prisma.division.update({
            where: { id: Array.isArray(id) ? id[0] : id },
            data: {
                ...(name && { name }),
                ...(organization_id && { organization_id: organization_id }),
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
 * DELETE DIVISION
 */
export const deleteDivision = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const existing = await prisma.division.findUnique({
            where: { id: Array.isArray(id) ? id[0] : id }
        });

        if (!existing) {
            return res.status(404).json({ message: "Division not found" });
        }

        await prisma.division.delete({
            where: { id: Array.isArray(id) ? id[0] : id }
        });

        return res.status(200).json({ message: "Division deleted successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
