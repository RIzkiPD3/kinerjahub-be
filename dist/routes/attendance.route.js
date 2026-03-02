"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const attendance_controller_1 = require("../controllers/attendance.controller");
const router = (0, express_1.Router)();
// All attendance routes require authentication
router.use(auth_middleware_1.requireAuth);
// POST   /api/attendances       - Create attendance
router.post("/", attendance_controller_1.createAttendance);
// GET    /api/attendances        - Get all my attendances (optional ?date=YYYY-MM-DD)
router.get("/", attendance_controller_1.getMyAttendances);
// GET    /api/attendances/:id    - Get attendance detail
router.get("/:id", attendance_controller_1.getAttendanceById);
// PUT    /api/attendances/:id    - Update attendance
router.put("/:id", attendance_controller_1.updateAttendance);
// DELETE /api/attendances/:id   - Delete attendance
router.delete("/:id", attendance_controller_1.deleteAttendance);
exports.default = router;
