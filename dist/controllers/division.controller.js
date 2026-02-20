"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDivision = exports.updateDivision = exports.createDivision = exports.getDivisionById = exports.getAllDivisions = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
/**
 * GET ALL DIVISIONS
 */
const getAllDivisions = async (req, res) => {
    try {
        const divisions = await prisma_1.default.division.findMany({
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getAllDivisions = getAllDivisions;
/**
 * GET DIVISION BY ID
 */
const getDivisionById = async (req, res) => {
    const { id } = req.params;
    try {
        const division = await prisma_1.default.division.findUnique({
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.getDivisionById = getDivisionById;
/**
 * CREATE DIVISION
 */
const createDivision = async (req, res) => {
    const { name, organization_id } = req.body;
    if (!name || !organization_id) {
        return res
            .status(400)
            .json({ message: "name and organization_id are required" });
    }
    try {
        const division = await prisma_1.default.division.create({
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.createDivision = createDivision;
/**
 * UPDATE DIVISION
 */
const updateDivision = async (req, res) => {
    const { id } = req.params;
    const { name, organization_id } = req.body;
    try {
        const existing = await prisma_1.default.division.findUnique({
            where: { id: Array.isArray(id) ? id[0] : id }
        });
        if (!existing) {
            return res.status(404).json({ message: "Division not found" });
        }
        const updated = await prisma_1.default.division.update({
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.updateDivision = updateDivision;
/**
 * DELETE DIVISION
 */
const deleteDivision = async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await prisma_1.default.division.findUnique({
            where: { id: Array.isArray(id) ? id[0] : id }
        });
        if (!existing) {
            return res.status(404).json({ message: "Division not found" });
        }
        await prisma_1.default.division.delete({
            where: { id: Array.isArray(id) ? id[0] : id }
        });
        return res.status(200).json({ message: "Division deleted successfully" });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.deleteDivision = deleteDivision;
