"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAttendance = exports.updateAttendance = exports.getAttendanceById = exports.getMyAttendances = exports.createAttendance = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
// ─────────────────────────────────────────────
// 1. CREATE ATTENDANCE
// ─────────────────────────────────────────────
const createAttendance = async (userId, organizationId, input) => {
    const { date, status, notes } = input;
    const dateObj = new Date(date);
    const attendance = await prisma_1.default.attendance.create({
        data: {
            user_id: userId,
            organization_id: organizationId,
            date: dateObj,
            status,
            notes,
        },
        include: {
            user: { select: { id: true, name: true, email: true } },
            organization: { select: { id: true, name: true } },
        },
    });
    return attendance;
};
exports.createAttendance = createAttendance;
// ─────────────────────────────────────────────
// 2. GET MY ATTENDANCES
// ─────────────────────────────────────────────
const getMyAttendances = async (userId, organizationId, dateFilter) => {
    const where = {
        user_id: userId,
        organization_id: organizationId,
    };
    if (dateFilter) {
        const dateObj = new Date(dateFilter);
        const nextDay = new Date(dateObj);
        nextDay.setDate(nextDay.getDate() + 1);
        where.date = {
            gte: dateObj,
            lt: nextDay,
        };
    }
    const attendances = await prisma_1.default.attendance.findMany({
        where,
        include: {
            user: { select: { id: true, name: true, email: true } },
            organization: { select: { id: true, name: true } },
        },
        orderBy: { date: "desc" },
    });
    return attendances;
};
exports.getMyAttendances = getMyAttendances;
// ─────────────────────────────────────────────
// 3. GET ATTENDANCE BY ID
// ─────────────────────────────────────────────
const getAttendanceById = async (id, userId, organizationId) => {
    const attendance = await prisma_1.default.attendance.findFirst({
        where: { id, organization_id: organizationId },
        include: {
            user: { select: { id: true, name: true, email: true } },
            organization: { select: { id: true, name: true } },
        },
    });
    if (!attendance)
        return { attendance: null, error: "not_found" };
    if (attendance.user_id !== userId)
        return { attendance: null, error: "forbidden" };
    return { attendance, error: null };
};
exports.getAttendanceById = getAttendanceById;
// ─────────────────────────────────────────────
// 4. UPDATE ATTENDANCE
// ─────────────────────────────────────────────
const updateAttendance = async (id, userId, organizationId, input) => {
    const existing = await prisma_1.default.attendance.findFirst({
        where: { id, organization_id: organizationId },
    });
    if (!existing)
        return { attendance: null, error: "not_found" };
    if (existing.user_id !== userId)
        return { attendance: null, error: "forbidden" };
    const updated = await prisma_1.default.attendance.update({
        where: { id },
        data: {
            ...(input.status !== undefined && { status: input.status }),
            ...(input.notes !== undefined && { notes: input.notes }),
        },
        include: {
            user: { select: { id: true, name: true, email: true } },
            organization: { select: { id: true, name: true } },
        },
    });
    return { attendance: updated, error: null };
};
exports.updateAttendance = updateAttendance;
// ─────────────────────────────────────────────
// 5. DELETE ATTENDANCE
// ─────────────────────────────────────────────
const deleteAttendance = async (id, userId, organizationId) => {
    const existing = await prisma_1.default.attendance.findFirst({
        where: { id, organization_id: organizationId },
    });
    if (!existing)
        return { error: "not_found" };
    if (existing.user_id !== userId)
        return { error: "forbidden" };
    await prisma_1.default.attendance.delete({ where: { id } });
    return { error: null };
};
exports.deleteAttendance = deleteAttendance;
