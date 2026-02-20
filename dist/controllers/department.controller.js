"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDepartment = exports.updateDepartment = exports.createDepartment = exports.getDepartmentById = exports.getAllDepartments = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
/**
 * GET ALL DEPARTMENTS
 */
const getAllDepartments = async (req, res) => {
    try {
        const departments = await prisma_1.default.department.findMany({
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getAllDepartments = getAllDepartments;
/**
 * GET DEPARTMENT BY ID
 */
const getDepartmentById = async (req, res) => {
    const id = Number(req.params.id);
    try {
        const department = await prisma_1.default.department.findUnique({
            where: { id },
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getDepartmentById = getDepartmentById;
/**
 * CREATE DEPARTMENT
 */
const createDepartment = async (req, res) => {
    const { name, division_id } = req.body;
    if (!name || !division_id) {
        return res
            .status(400)
            .json({ message: "name and division_id are required" });
    }
    try {
        // Derive organization_id from division
        const division = await prisma_1.default.division.findUnique({
            where: { id: Number(division_id) },
            select: { organization_id: true }
        });
        if (!division) {
            return res.status(404).json({ message: "Division not found" });
        }
        const department = await prisma_1.default.department.create({
            data: {
                name,
                organization_id: division.organization_id,
                division_id: Number(division_id),
            },
            select: {
                id: true,
                name: true,
                division_id: true,
                created_at: true,
            },
        });
        return res.status(201).json(department);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.createDepartment = createDepartment;
/**
 * UPDATE DEPARTMENT
 */
const updateDepartment = async (req, res) => {
    const id = Number(req.params.id);
    const { name, division_id } = req.body;
    try {
        const existing = await prisma_1.default.department.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "Department not found" });
        }
        let organization_id = undefined;
        if (division_id) {
            const division = await prisma_1.default.division.findUnique({
                where: { id: Number(division_id) },
                select: { organization_id: true }
            });
            if (!division) {
                return res.status(404).json({ message: "Division not found" });
            }
            organization_id = division.organization_id;
        }
        const updated = await prisma_1.default.department.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(division_id && {
                    division_id: Number(division_id),
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.updateDepartment = updateDepartment;
/**
 * DELETE DEPARTMENT
 */
const deleteDepartment = async (req, res) => {
    const id = Number(req.params.id);
    try {
        const existing = await prisma_1.default.department.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "Department not found" });
        }
        await prisma_1.default.department.delete({ where: { id } });
        return res.status(200).json({ message: "Department deleted successfully" });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.deleteDepartment = deleteDepartment;
