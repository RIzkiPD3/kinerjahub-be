import { Response } from "express";
import { z } from "zod";
import { AttendanceStatus } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";
import * as attendanceService from "../services/attendance.service";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function handleZodError(res: Response, result: any) {
    return res.status(400).json({
        success: false,
        message: "Input tidak valid",
        errors: result.error.issues.map((issue: z.ZodIssue) => ({
            path: issue.path.join("."),
            message: issue.message,
        })),
    });
}

function paramStr(val: string | string[]): string {
    return Array.isArray(val) ? val[0] : val;
}

// ─────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────

const createAttendanceSchema = z.object({
    date: z.string().min(1, "Tanggal wajib diisi"),
    status: z.enum(["PRESENT", "SICK", "PERMISSION", "ABSENT"]),
    notes: z.string().optional(),
});

const updateAttendanceSchema = z.object({
    status: z.enum(["PRESENT", "SICK", "PERMISSION", "ABSENT"]).optional(),
    notes: z.string().optional(),
});

// ─────────────────────────────────────────────
// 1. CREATE ATTENDANCE
// ─────────────────────────────────────────────

export const createAttendance = async (req: AuthRequest, res: Response) => {
    const { id: userId, organization_id } = req.user!;

    const parsed = createAttendanceSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed);

    try {
        const attendance = await attendanceService.createAttendance(
            userId,
            organization_id,
            parsed.data
        );

        return res.status(201).json({
            success: true,
            message: "Attendance berhasil dicatat",
            data: attendance,
        });
    } catch (error) {
        console.error("createAttendance error:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
};

// ─────────────────────────────────────────────
// 2. GET MY ATTENDANCES
// ─────────────────────────────────────────────

export const getMyAttendances = async (req: AuthRequest, res: Response) => {
    const { id: userId, organization_id } = req.user!;
    const dateFilter = req.query.date as string | undefined;

    if (dateFilter && isNaN(new Date(dateFilter).getTime())) {
        return res.status(400).json({
            success: false,
            message: "Format query tanggal tidak valid. Gunakan format YYYY-MM-DD",
        });
    }

    try {
        const attendances = await attendanceService.getMyAttendances(
            userId,
            organization_id,
            dateFilter
        );

        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil daftar attendance",
            data: attendances,
        });
    } catch (error) {
        console.error("getMyAttendances error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// 3. GET ATTENDANCE DETAIL
// ─────────────────────────────────────────────

export const getAttendanceById = async (req: AuthRequest, res: Response) => {
    const id = paramStr(req.params.id);
    const { id: userId, organization_id } = req.user!;

    try {
        const { attendance, error } = await attendanceService.getAttendanceById(
            id,
            userId,
            organization_id
        );

        if (error === "not_found") {
            return res.status(404).json({ success: false, message: "Attendance tidak ditemukan" });
        }
        if (error === "forbidden") {
            return res.status(403).json({ success: false, message: "Anda tidak memiliki akses ke attendance ini" });
        }

        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil detail attendance",
            data: attendance,
        });
    } catch (error) {
        console.error("getAttendanceById error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// 4. UPDATE ATTENDANCE
// ─────────────────────────────────────────────

export const updateAttendance = async (req: AuthRequest, res: Response) => {
    const id = paramStr(req.params.id);
    const { id: userId, organization_id } = req.user!;

    const parsed = updateAttendanceSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed);

    if (!parsed.data.status && parsed.data.notes === undefined) {
        return res.status(400).json({
            success: false,
            message: "Minimal satu field harus diisi (status atau notes)",
        });
    }

    try {
        const { attendance, error } = await attendanceService.updateAttendance(
            id,
            userId,
            organization_id,
            parsed.data
        );

        if (error === "not_found") {
            return res.status(404).json({ success: false, message: "Attendance tidak ditemukan" });
        }
        if (error === "forbidden") {
            return res.status(403).json({ success: false, message: "Anda tidak memiliki akses untuk mengubah attendance ini" });
        }

        return res.status(200).json({
            success: true,
            message: "Attendance berhasil diperbarui",
            data: attendance,
        });
    } catch (error) {
        console.error("updateAttendance error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// 5. DELETE ATTENDANCE
// ─────────────────────────────────────────────

export const deleteAttendance = async (req: AuthRequest, res: Response) => {
    const id = paramStr(req.params.id);
    const { id: userId, organization_id } = req.user!;

    try {
        const { error } = await attendanceService.deleteAttendance(id, userId, organization_id);

        if (error === "not_found") {
            return res.status(404).json({ success: false, message: "Attendance tidak ditemukan" });
        }
        if (error === "forbidden") {
            return res.status(403).json({ success: false, message: "Anda tidak memiliki akses untuk menghapus attendance ini" });
        }

        return res.status(200).json({
            success: true,
            message: "Attendance berhasil dihapus",
            data: null,
        });
    } catch (error) {
        console.error("deleteAttendance error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
