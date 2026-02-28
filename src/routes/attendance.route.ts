import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
    createAttendance,
    getMyAttendances,
    getAttendanceById,
    updateAttendance,
    deleteAttendance,
} from "../controllers/attendance.controller";

const router = Router();

// All attendance routes require authentication
router.use(requireAuth);

// POST   /api/attendances       - Create attendance
router.post("/", createAttendance);

// GET    /api/attendances        - Get all my attendances (optional ?date=YYYY-MM-DD)
router.get("/", getMyAttendances);

// GET    /api/attendances/:id    - Get attendance detail
router.get("/:id", getAttendanceById);

// PUT    /api/attendances/:id    - Update attendance
router.put("/:id", updateAttendance);

// DELETE /api/attendances/:id   - Delete attendance
router.delete("/:id", deleteAttendance);

export default router;
