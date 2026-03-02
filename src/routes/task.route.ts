import { Router } from "express";
import {
    createTask,
    getAllTasks,
    getTaskById,
    updateTask,
    deleteTask,
    assignTask,
} from "../controllers/task.controller";
import { verifyToken, authorizeRole } from "../middleware/auth.middleware";

const router = Router();

/**
 * @openapi
 * /api/tasks:
 *   post:
 *     tags:
 *       - Tasks
 *     summary: Create a new task (Admin & Koordinator only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - story_point
 *               - deadline
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 150
 *               description:
 *                 type: string
 *               story_point:
 *                 type: integer
 *                 minimum: 1
 *               deadline:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
// router.post("/", verifyToken, authorizeRole(["Admin", "Koordinator"]), createTask); // Moved to project.route.ts (/projects/:projectId/tasks)


/**
 * @openapi
 * /api/tasks:
 *   get:
 *     tags:
 *       - Tasks
 *     summary: Get all tasks (role-based filtering)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [TO_DO, IN_PROGRESS, DONE, DELIVERED]
 *       - in: query
 *         name: assigned_to
 *         schema:
 *           type: string
 *       - in: query
 *         name: department_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of tasks
 *       401:
 *         description: Unauthorized
 */
router.get("/", verifyToken, getAllTasks);

/**
 * @openapi
 * /api/tasks/{id}:
 *   get:
 *     tags:
 *       - Tasks
 *     summary: Get task by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task detail
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 */
router.get("/:id", verifyToken, getTaskById);

/**
 * @openapi
 * /api/tasks/{id}:
 *   patch:
 *     tags:
 *       - Tasks
 *     summary: Update task (partial)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               story_point:
 *                 type: integer
 *                 minimum: 1
 *               deadline:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [TO_DO, IN_PROGRESS, DONE, DELIVERED]
 *     responses:
 *       200:
 *         description: Task updated
 *       400:
 *         description: Validation error or invalid status transition
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 */
router.patch("/:id", verifyToken, updateTask);

/**
 * @openapi
 * /api/tasks/{id}:
 *   delete:
 *     tags:
 *       - Tasks
 *     summary: Delete task (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted
 *       400:
 *         description: Cannot delete DELIVERED task
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 */
router.delete("/:id", verifyToken, authorizeRole(["Admin"]), deleteTask);

/**
 * @openapi
 * /api/tasks/{id}/assign:
 *   patch:
 *     tags:
 *       - Tasks
 *     summary: Assign task to user (Admin & Koordinator only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assigned_to
 *             properties:
 *               assigned_to:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Task assigned successfully
 *       400:
 *         description: Invalid user or task status DELIVERED
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 */
router.patch(
    "/:id/assign",
    verifyToken,
    authorizeRole(["Admin", "Koordinator"]),
    assignTask
);

export default router;
