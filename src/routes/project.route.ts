import { Router } from "express";
import {
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject,
} from "../controllers/project.controller";
import {
    createTask,
    getTasksByProject,
} from "../controllers/task.controller";
import { verifyToken, authorizeRole } from "../middleware/auth.middleware";

const router = Router();

// ─── Project CRUD ───────────────────────────────────────────────────────────

// POST /api/projects
router.post(
    "/",
    verifyToken,
    authorizeRole(["Admin", "Koordinator"]),
    createProject
);

// GET /api/projects
router.get("/", verifyToken, getAllProjects);

// GET /api/projects/:id
router.get("/:id", verifyToken, getProjectById);

// PUT /api/projects/:id
router.put(
    "/:id",
    verifyToken,
    authorizeRole(["Admin", "Koordinator"]),
    updateProject
);

// DELETE /api/projects/:id
router.delete(
    "/:id",
    verifyToken,
    authorizeRole(["Admin"]),
    deleteProject
);

// ─── Nested Task Routes ──────────────────────────────────────────────────────

// GET /api/projects/:projectId/tasks
router.get("/:projectId/tasks", verifyToken, getTasksByProject);

// POST /api/projects/:projectId/tasks
router.post(
    "/:projectId/tasks",
    verifyToken,
    authorizeRole(["Admin", "Koordinator"]),
    createTask
);

export default router;
