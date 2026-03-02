"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAttendance = exports.updateAttendance = exports.getAttendanceById = exports.getMyAttendances = exports.createAttendance = void 0;
const zod_1 = require("zod");
const attendanceService = __importStar(require("../services/attendance.service"));
// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function handleZodError(res, result) {
    return res.status(400).json({
        success: false,
        message: "Input tidak valid",
        errors: result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
        })),
    });
}
function paramStr(val) {
    return Array.isArray(val) ? val[0] : val;
}
// ─────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────
const createAttendanceSchema = zod_1.z.object({
    date: zod_1.z.string().min(1, "Tanggal wajib diisi"),
    status: zod_1.z.enum(["PRESENT", "SICK", "PERMISSION", "ABSENT"]),
    notes: zod_1.z.string().optional(),
});
const updateAttendanceSchema = zod_1.z.object({
    status: zod_1.z.enum(["PRESENT", "SICK", "PERMISSION", "ABSENT"]).optional(),
    notes: zod_1.z.string().optional(),
});
// ─────────────────────────────────────────────
// 1. CREATE ATTENDANCE
// ─────────────────────────────────────────────
const createAttendance = async (req, res) => {
    const { id: userId, organization_id } = req.user;
    const parsed = createAttendanceSchema.safeParse(req.body);
    if (!parsed.success)
        return handleZodError(res, parsed);
    try {
        const attendance = await attendanceService.createAttendance(userId, organization_id, parsed.data);
        return res.status(201).json({
            success: true,
            message: "Attendance berhasil dicatat",
            data: attendance,
        });
    }
    catch (error) {
        console.error("createAttendance error:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
};
exports.createAttendance = createAttendance;
// ─────────────────────────────────────────────
// 2. GET MY ATTENDANCES
// ─────────────────────────────────────────────
const getMyAttendances = async (req, res) => {
    const { id: userId, organization_id } = req.user;
    const dateFilter = req.query.date;
    if (dateFilter && isNaN(new Date(dateFilter).getTime())) {
        return res.status(400).json({
            success: false,
            message: "Format query tanggal tidak valid. Gunakan format YYYY-MM-DD",
        });
    }
    try {
        const attendances = await attendanceService.getMyAttendances(userId, organization_id, dateFilter);
        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil daftar attendance",
            data: attendances,
        });
    }
    catch (error) {
        console.error("getMyAttendances error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.getMyAttendances = getMyAttendances;
// ─────────────────────────────────────────────
// 3. GET ATTENDANCE DETAIL
// ─────────────────────────────────────────────
const getAttendanceById = async (req, res) => {
    const id = paramStr(req.params.id);
    const { id: userId, organization_id } = req.user;
    try {
        const { attendance, error } = await attendanceService.getAttendanceById(id, userId, organization_id);
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
    }
    catch (error) {
        console.error("getAttendanceById error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.getAttendanceById = getAttendanceById;
// ─────────────────────────────────────────────
// 4. UPDATE ATTENDANCE
// ─────────────────────────────────────────────
const updateAttendance = async (req, res) => {
    const id = paramStr(req.params.id);
    const { id: userId, organization_id } = req.user;
    const parsed = updateAttendanceSchema.safeParse(req.body);
    if (!parsed.success)
        return handleZodError(res, parsed);
    if (!parsed.data.status && parsed.data.notes === undefined) {
        return res.status(400).json({
            success: false,
            message: "Minimal satu field harus diisi (status atau notes)",
        });
    }
    try {
        const { attendance, error } = await attendanceService.updateAttendance(id, userId, organization_id, parsed.data);
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
    }
    catch (error) {
        console.error("updateAttendance error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.updateAttendance = updateAttendance;
// ─────────────────────────────────────────────
// 5. DELETE ATTENDANCE
// ─────────────────────────────────────────────
const deleteAttendance = async (req, res) => {
    const id = paramStr(req.params.id);
    const { id: userId, organization_id } = req.user;
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
    }
    catch (error) {
        console.error("deleteAttendance error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.deleteAttendance = deleteAttendance;
