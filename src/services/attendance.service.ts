import { AttendanceStatus } from "@prisma/client";
import prisma from "../lib/prisma";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CreateAttendanceInput {
    date: string;
    status: AttendanceStatus;
    notes?: string;
}

export interface UpdateAttendanceInput {
    status?: AttendanceStatus;
    notes?: string;
}

// ─────────────────────────────────────────────
// 1. CREATE ATTENDANCE
// ─────────────────────────────────────────────

export const createAttendance = async (
    userId: string,
    organizationId: string,
    input: CreateAttendanceInput
) => {
    const { date, status, notes } = input;
    const dateObj = new Date(date);

    const attendance = await prisma.attendance.create({
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

// ─────────────────────────────────────────────
// 2. GET MY ATTENDANCES
// ─────────────────────────────────────────────

export const getMyAttendances = async (
    userId: string,
    organizationId: string,
    dateFilter?: string
) => {
    const where: any = {
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

    const attendances = await prisma.attendance.findMany({
        where,
        include: {
            user: { select: { id: true, name: true, email: true } },
            organization: { select: { id: true, name: true } },
        },
        orderBy: { date: "desc" },
    });

    return attendances;
};

// ─────────────────────────────────────────────
// 3. GET ATTENDANCE BY ID
// ─────────────────────────────────────────────

export const getAttendanceById = async (
    id: string,
    userId: string,
    organizationId: string
) => {
    const attendance = await prisma.attendance.findFirst({
        where: { id, organization_id: organizationId },
        include: {
            user: { select: { id: true, name: true, email: true } },
            organization: { select: { id: true, name: true } },
        },
    });

    if (!attendance) return { attendance: null, error: "not_found" };
    if (attendance.user_id !== userId) return { attendance: null, error: "forbidden" };

    return { attendance, error: null };
};

// ─────────────────────────────────────────────
// 4. UPDATE ATTENDANCE
// ─────────────────────────────────────────────

export const updateAttendance = async (
    id: string,
    userId: string,
    organizationId: string,
    input: UpdateAttendanceInput
) => {
    const existing = await prisma.attendance.findFirst({
        where: { id, organization_id: organizationId },
    });

    if (!existing) return { attendance: null, error: "not_found" };
    if (existing.user_id !== userId) return { attendance: null, error: "forbidden" };

    const updated = await prisma.attendance.update({
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

// ─────────────────────────────────────────────
// 5. DELETE ATTENDANCE
// ─────────────────────────────────────────────

export const deleteAttendance = async (
    id: string,
    userId: string,
    organizationId: string
) => {
    const existing = await prisma.attendance.findFirst({
        where: { id, organization_id: organizationId },
    });

    if (!existing) return { error: "not_found" };
    if (existing.user_id !== userId) return { error: "forbidden" };

    await prisma.attendance.delete({ where: { id } });

    return { error: null };
};
