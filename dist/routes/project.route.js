"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const project_controller_1 = require("../controllers/project.controller");
const task_controller_1 = require("../controllers/task.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// ─── Project CRUD ───────────────────────────────────────────────────────────
// POST /api/projects
router.post("/", auth_middleware_1.verifyToken, (0, auth_middleware_1.authorizeRole)(["Admin", "Koordinator"]), project_controller_1.createProject);
// GET /api/projects
router.get("/", auth_middleware_1.verifyToken, project_controller_1.getAllProjects);
// GET /api/projects/:id
router.get("/:id", auth_middleware_1.verifyToken, project_controller_1.getProjectById);
// PUT /api/projects/:id
router.put("/:id", auth_middleware_1.verifyToken, (0, auth_middleware_1.authorizeRole)(["Admin", "Koordinator"]), project_controller_1.updateProject);
// DELETE /api/projects/:id
router.delete("/:id", auth_middleware_1.verifyToken, (0, auth_middleware_1.authorizeRole)(["Admin"]), project_controller_1.deleteProject);
// ─── Nested Task Routes ──────────────────────────────────────────────────────
// GET /api/projects/:projectId/tasks
router.get("/:projectId/tasks", auth_middleware_1.verifyToken, task_controller_1.getTasksByProject);
// POST /api/projects/:projectId/tasks
router.post("/:projectId/tasks", auth_middleware_1.verifyToken, (0, auth_middleware_1.authorizeRole)(["Admin", "Koordinator"]), task_controller_1.createTask);
exports.default = router;
