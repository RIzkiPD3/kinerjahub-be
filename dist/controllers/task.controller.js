"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignTask = exports.deleteTask = exports.updateTask = exports.getTaskById = exports.getAllTasks = exports.getTasksByProject = exports.createTask = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../lib/prisma"));
// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const VALID_TRANSITIONS = {
    TO_DO: [client_1.TaskStatus.IN_PROGRESS],
    IN_PROGRESS: [client_1.TaskStatus.DONE],
    DONE: [client_1.TaskStatus.DELIVERED],
    DELIVERED: [],
};
function isAdminOrKoordinator(role) {
    const r = role.toLowerCase();
    return r === "admin" || r === "koordinator";
}
function isAdmin(role) {
    return role.toLowerCase() === "admin";
}
function paramStr(val) {
    return Array.isArray(val) ? val[0] : val;
}
function handleZodError(res, result) {
    if (result.success)
        return res;
    return res.status(400).json({
        success: false,
        message: "Input tidak valid",
        errors: result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
        })),
    });
}
// ─────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────
const createTaskSchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .min(1, "Judul wajib diisi")
        .max(150, "Judul maksimal 150 karakter"),
    description: zod_1.z.string().optional(),
    assigned_to: zod_1.z.string().uuid("assigned_to harus berupa UUID yang valid").optional().nullable(),
    story_point: zod_1.z
        .coerce.number()
        .int("Story point harus berupa bilangan bulat")
        .min(1, "Story point minimal 1")
        .max(10, "Story point maksimal 10"),
    deadline: zod_1.z.string().min(1, "Deadline wajib diisi"),
});
const updateTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Judul minimal 1 karakter").max(150, "Judul maksimal 150 karakter").optional(),
    description: zod_1.z.string().optional(),
    story_point: zod_1.z
        .coerce.number()
        .int("Story point harus berupa bilangan bulat")
        .min(1, "Story point minimal 1")
        .optional(),
    deadline: zod_1.z.string().optional(),
    status: zod_1.z.enum(["TO_DO", "IN_PROGRESS", "DONE", "DELIVERED"]).optional(),
});
const assignTaskSchema = zod_1.z.object({
    assigned_to: zod_1.z.string().uuid("assigned_to harus UUID yang valid"),
});
// ─────────────────────────────────────────────
// Task Response Mapper
// ─────────────────────────────────────────────
// Helper to format task response as requested in Rule 7
function mapTaskResponse(t) {
    return {
        id: t.id,
        title: t.title,
        description: t.description,
        story_point: t.story_point,
        deadline: t.deadline,
        status: t.status,
        projectName: t.project?.name,
        divisionName: t.project?.division?.name,
        departmentName: t.project?.department?.name,
        assignedUser: t.assignee ? {
            id: t.assignee.id,
            name: t.assignee.name,
            email: t.assignee.email
        } : null,
        creator: t.creator ? {
            id: t.creator.id,
            name: t.creator.name,
            email: t.creator.email
        } : null,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
    };
}
const taskInclude = {
    creator: { select: { id: true, name: true, email: true } },
    assignee: { select: { id: true, name: true, email: true } },
    project: {
        select: {
            id: true,
            name: true,
            division: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } }
        }
    }
};
// ─────────────────────────────────────────────
// 1. CREATE TASK
// ─────────────────────────────────────────────
const createTask = async (req, res) => {
    const projectId = paramStr(req.params.projectId);
    const { id: actor_id, organization_id, role } = req.user;
    if (!isAdminOrKoordinator(role)) {
        return res.status(403).json({
            success: false,
            message: "Hanya Admin dan Koordinator yang dapat membuat task",
        });
    }
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success)
        return handleZodError(res, parsed);
    const { title, description, assigned_to, story_point, deadline } = parsed.data;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (deadlineDate < today) {
        return res.status(400).json({
            success: false,
            message: "Deadline tidak boleh tanggal yang sudah lewat",
        });
    }
    try {
        const project = await prisma_1.default.project.findFirst({
            where: { id: projectId, organization_id, deleted_at: null },
        });
        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project tidak ditemukan atau tidak tersedia",
            });
        }
        if (assigned_to) {
            const assignee = await prisma_1.default.user.findFirst({
                where: { id: assigned_to, organization_id },
            });
            if (!assignee) {
                return res.status(404).json({
                    success: false,
                    message: "User yang dituju (assignee) tidak ditemukan di organisasi Anda",
                });
            }
        }
        const task = await prisma_1.default.$transaction(async (tx) => {
            const newTask = await tx.task.create({
                data: {
                    title,
                    description,
                    story_point,
                    deadline: deadlineDate,
                    status: client_1.TaskStatus.TO_DO,
                    assigned_to: assigned_to || undefined,
                    created_by: actor_id,
                    project_id: projectId,
                },
                include: taskInclude,
            });
            await tx.taskLog.create({
                data: {
                    task_id: newTask.id,
                    user_id: actor_id,
                    organization_id,
                    activity: "Task dibuat",
                    new_status: client_1.TaskStatus.TO_DO,
                },
            });
            return newTask;
        });
        return res.status(201).json({
            success: true,
            message: "Task berhasil dibuat",
            data: mapTaskResponse(task),
        });
    }
    catch (error) {
        console.error("createTask error:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server saat membuat task"
        });
    }
};
exports.createTask = createTask;
// ─────────────────────────────────────────────
// 2. GET TASKS BY PROJECT
// ─────────────────────────────────────────────
const getTasksByProject = async (req, res) => {
    const projectId = paramStr(req.params.projectId);
    const { organization_id } = req.user;
    try {
        const project = await prisma_1.default.project.findFirst({
            where: { id: projectId, organization_id, deleted_at: null },
        });
        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project tidak ditemukan",
            });
        }
        const tasks = await prisma_1.default.task.findMany({
            where: { project_id: projectId },
            include: taskInclude,
            orderBy: { created_at: "desc" },
        });
        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil daftar task project",
            data: tasks.map(mapTaskResponse),
        });
    }
    catch (error) {
        console.error("getTasksByProject error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.getTasksByProject = getTasksByProject;
// ─────────────────────────────────────────────
// 2.1 GET ALL TASKS (Legacy / Global)
// ─────────────────────────────────────────────
const getAllTasks = async (req, res) => {
    const { id: user_id, organization_id, department_id, role } = req.user;
    const statusParam = req.query.status;
    const where = {
        project: {
            organization_id,
            deleted_at: null
        }
    };
    const roleLC = role.toLowerCase();
    if (roleLC === "koordinator") {
        where.project.department_id = department_id;
    }
    else if (roleLC === "staff") {
        where.assigned_to = user_id;
    }
    if (statusParam)
        where.status = statusParam;
    try {
        const tasks = await prisma_1.default.task.findMany({
            where,
            include: taskInclude,
            orderBy: { created_at: "desc" },
        });
        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil daftar task",
            data: tasks.map(mapTaskResponse),
        });
    }
    catch (error) {
        console.error("getAllTasks error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.getAllTasks = getAllTasks;
// ─────────────────────────────────────────────
// 3. GET TASK DETAIL
// ─────────────────────────────────────────────
const getTaskById = async (req, res) => {
    const id = paramStr(req.params.id);
    const { id: user_id, organization_id, role } = req.user;
    try {
        const task = await prisma_1.default.task.findFirst({
            where: {
                id,
                project: { organization_id, deleted_at: null }
            },
            include: {
                ...taskInclude,
                task_logs: {
                    include: { user: { select: { id: true, name: true } } },
                    orderBy: { created_at: "desc" },
                },
            },
        });
        if (!task) {
            return res.status(404).json({ success: false, message: "Task tidak ditemukan" });
        }
        if (role.toLowerCase() === "staff" && task.assigned_to !== user_id) {
            return res.status(403).json({
                success: false,
                message: "Anda tidak memiliki akses ke task ini",
            });
        }
        const { task_logs, ...rest } = task;
        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil detail task",
            data: {
                ...mapTaskResponse(rest),
                task_logs
            },
        });
    }
    catch (error) {
        console.error("getTaskById error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.getTaskById = getTaskById;
// ─────────────────────────────────────────────
// 4. UPDATE TASK
// ─────────────────────────────────────────────
const updateTask = async (req, res) => {
    const id = paramStr(req.params.id);
    const { id: actor_id, organization_id, role } = req.user;
    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success)
        return handleZodError(res, parsed);
    const { title, description, story_point, deadline, status } = parsed.data;
    try {
        const task = await prisma_1.default.task.findFirst({
            where: {
                id,
                project: { organization_id, deleted_at: null }
            },
        });
        if (!task) {
            return res.status(404).json({ success: false, message: "Task tidak ditemukan" });
        }
        const roleLC = role.toLowerCase();
        if (roleLC === "staff" && task.assigned_to !== actor_id) {
            return res.status(403).json({
                success: false,
                message: "Anda tidak memiliki akses ke task ini",
            });
        }
        if (status !== undefined && status !== task.status) {
            const validNext = VALID_TRANSITIONS[task.status] || [];
            if (!validNext.includes(status) && !isAdminOrKoordinator(role)) {
                return res.status(400).json({
                    success: false,
                    message: `Status tidak valid. Dari ${task.status}, status hanya bisa berubah ke: ${validNext.join(", ")}`,
                });
            }
            if (status === client_1.TaskStatus.DELIVERED && !isAdminOrKoordinator(role)) {
                return res.status(403).json({
                    success: false,
                    message: "Hanya Admin/Koordinator yang bisa mengubah status ke DELIVERED",
                });
            }
        }
        if (deadline !== undefined && !isAdminOrKoordinator(role)) {
            return res.status(403).json({
                success: false,
                message: "Hanya Admin/Koordinator yang bisa mengubah deadline",
            });
        }
        let deadlineDate;
        if (deadline !== undefined) {
            deadlineDate = new Date(deadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (deadlineDate < today) {
                return res.status(400).json({
                    success: false,
                    message: "Deadline tidak boleh tanggal yang sudah lewat",
                });
            }
        }
        const updated = await prisma_1.default.$transaction(async (tx) => {
            const updatedTask = await tx.task.update({
                where: { id },
                data: {
                    ...(title !== undefined && { title }),
                    ...(description !== undefined && { description }),
                    ...(story_point !== undefined && { story_point }),
                    ...(deadlineDate !== undefined && { deadline: deadlineDate }),
                    ...(status !== undefined && { status }),
                },
                include: taskInclude,
            });
            if (status !== undefined && status !== task.status) {
                await tx.taskLog.create({
                    data: {
                        task_id: id,
                        user_id: actor_id,
                        organization_id,
                        activity: `Status berubah dari ${task.status} ke ${status}`,
                        old_status: task.status,
                        new_status: status,
                    },
                });
            }
            else {
                await tx.taskLog.create({
                    data: {
                        task_id: id,
                        user_id: actor_id,
                        organization_id,
                        activity: "Data task diperbarui",
                    },
                });
            }
            return updatedTask;
        });
        return res.status(200).json({
            success: true,
            message: "Task berhasil diupdate",
            data: mapTaskResponse(updated),
        });
    }
    catch (error) {
        console.error("updateTask error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.updateTask = updateTask;
// ─────────────────────────────────────────────
// 5. DELETE TASK
// ─────────────────────────────────────────────
const deleteTask = async (req, res) => {
    const id = paramStr(req.params.id);
    const { organization_id, role } = req.user;
    if (!isAdmin(role)) {
        return res.status(403).json({
            success: false,
            message: "Hanya Admin yang dapat menghapus task",
        });
    }
    try {
        const task = await prisma_1.default.task.findFirst({
            where: {
                id,
                project: { organization_id }
            },
        });
        if (!task) {
            return res.status(404).json({ success: false, message: "Task tidak ditemukan" });
        }
        if (task.status === client_1.TaskStatus.DELIVERED) {
            return res.status(400).json({
                success: false,
                message: "Task dengan status DELIVERED tidak dapat dihapus",
            });
        }
        await prisma_1.default.task.delete({ where: { id } });
        return res.status(200).json({
            success: true,
            message: "Task berhasil dihapus",
            data: null,
        });
    }
    catch (error) {
        console.error("deleteTask error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.deleteTask = deleteTask;
// ─────────────────────────────────────────────
// 6. ASSIGN TASK
// ─────────────────────────────────────────────
const assignTask = async (req, res) => {
    const id = paramStr(req.params.id);
    const { id: actor_id, organization_id, role } = req.user;
    if (!isAdminOrKoordinator(role)) {
        return res.status(403).json({
            success: false,
            message: "Hanya Admin/Koordinator yang dapat assign task",
        });
    }
    const parsed = assignTaskSchema.safeParse(req.body);
    if (!parsed.success)
        return handleZodError(res, parsed);
    const { assigned_to } = parsed.data;
    try {
        const task = await prisma_1.default.task.findFirst({
            where: {
                id,
                project: { organization_id, deleted_at: null }
            },
        });
        if (!task) {
            return res.status(404).json({ success: false, message: "Task tidak ditemukan" });
        }
        if (task.status === client_1.TaskStatus.DELIVERED) {
            return res.status(400).json({
                success: false,
                message: "Task dengan status DELIVERED tidak dapat di-assign",
            });
        }
        const assignee = await prisma_1.default.user.findFirst({
            where: {
                id: assigned_to,
                organization_id,
            },
            select: { id: true, name: true, email: true },
        });
        if (!assignee) {
            return res.status(400).json({
                success: false,
                message: "User yang dituju tidak ditemukan di organisasi Anda",
            });
        }
        const [updatedTask] = await prisma_1.default.$transaction([
            prisma_1.default.task.update({
                where: { id },
                data: { assigned_to },
                include: taskInclude,
            }),
            prisma_1.default.taskLog.create({
                data: {
                    task_id: id,
                    user_id: actor_id,
                    organization_id,
                    activity: `Task di-assign ke ${assignee.name} (${assignee.email})`,
                    old_status: task.status,
                    new_status: task.status,
                },
            }),
        ]);
        return res.status(200).json({
            success: true,
            message: `Task berhasil di-assign ke ${assignee.name}`,
            data: mapTaskResponse(updatedTask),
        });
    }
    catch (error) {
        console.error("assignTask error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.assignTask = assignTask;
