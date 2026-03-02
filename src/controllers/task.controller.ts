import { Response } from "express";
import { z } from "zod";
import { TaskStatus } from "@prisma/client";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
    TO_DO: [TaskStatus.IN_PROGRESS],
    IN_PROGRESS: [TaskStatus.DONE],
    DONE: [TaskStatus.DELIVERED],
    DELIVERED: [],
};

function isAdminOrKoordinator(role: string): boolean {
    const r = role.toLowerCase();
    return r === "admin" || r === "koordinator";
}

function isAdmin(role: string): boolean {
    return role.toLowerCase() === "admin";
}

function paramStr(val: string | string[]): string {
    return Array.isArray(val) ? val[0] : val;
}

function handleZodError(res: Response, result: any) {
    if (result.success) return res;
    return res.status(400).json({
        success: false,
        message: "Input tidak valid",
        errors: result.error.issues.map((issue: z.ZodIssue) => ({
            path: issue.path.join("."),
            message: issue.message,
        })),
    });
}

// ─────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────

const createTaskSchema = z.object({
    title: z
        .string()
        .min(1, "Judul wajib diisi")
        .max(150, "Judul maksimal 150 karakter"),
    description: z.string().optional(),
    assigned_to: z.string().uuid("assigned_to harus berupa UUID yang valid").optional().nullable(),
    story_point: z
        .coerce.number()
        .int("Story point harus berupa bilangan bulat")
        .min(1, "Story point minimal 1")
        .max(10, "Story point maksimal 10"),
    deadline: z.string().min(1, "Deadline wajib diisi"),
});

const updateTaskSchema = z.object({
    title: z.string().min(1, "Judul minimal 1 karakter").max(150, "Judul maksimal 150 karakter").optional(),
    description: z.string().optional(),
    story_point: z
        .coerce.number()
        .int("Story point harus berupa bilangan bulat")
        .min(1, "Story point minimal 1")
        .optional(),
    deadline: z.string().optional(),
    status: z.enum(["TO_DO", "IN_PROGRESS", "DONE", "DELIVERED"]).optional(),
});

const assignTaskSchema = z.object({
    assigned_to: z.string().uuid("assigned_to harus UUID yang valid"),
});

// ─────────────────────────────────────────────
// Task Response Mapper
// ─────────────────────────────────────────────

// Helper to format task response as requested in Rule 7
function mapTaskResponse(t: any) {
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

export const createTask = async (req: AuthRequest, res: Response) => {
    const projectId = paramStr(req.params.projectId);
    const { id: actor_id, organization_id, role } = req.user!;

    if (!isAdminOrKoordinator(role)) {
        return res.status(403).json({
            success: false,
            message: "Hanya Admin dan Koordinator yang dapat membuat task",
        });
    }

    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed);

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
        const project = await prisma.project.findFirst({
            where: { id: projectId, organization_id, deleted_at: null },
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project tidak ditemukan atau tidak tersedia",
            });
        }

        if (assigned_to) {
            const assignee = await prisma.user.findFirst({
                where: { id: assigned_to, organization_id },
            });

            if (!assignee) {
                return res.status(404).json({
                    success: false,
                    message: "User yang dituju (assignee) tidak ditemukan di organisasi Anda",
                });
            }
        }

        const task = await prisma.$transaction(async (tx) => {
            const newTask = await tx.task.create({
                data: {
                    title,
                    description,
                    story_point,
                    deadline: deadlineDate,
                    status: TaskStatus.TO_DO,
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
                    new_status: TaskStatus.TO_DO,
                },
            });

            return newTask;
        });

        return res.status(201).json({
            success: true,
            message: "Task berhasil dibuat",
            data: mapTaskResponse(task),
        });
    } catch (error) {
        console.error("createTask error:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server saat membuat task"
        });
    }
};

// ─────────────────────────────────────────────
// 2. GET TASKS BY PROJECT
// ─────────────────────────────────────────────

export const getTasksByProject = async (req: AuthRequest, res: Response) => {
    const projectId = paramStr(req.params.projectId);
    const { organization_id } = req.user!;

    try {
        const project = await prisma.project.findFirst({
            where: { id: projectId, organization_id, deleted_at: null },
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project tidak ditemukan",
            });
        }

        const tasks = await prisma.task.findMany({
            where: { project_id: projectId },
            include: taskInclude,
            orderBy: { created_at: "desc" },
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil daftar task project",
            data: tasks.map(mapTaskResponse),
        });
    } catch (error) {
        console.error("getTasksByProject error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// 2.1 GET ALL TASKS (Legacy / Global)
// ─────────────────────────────────────────────

export const getAllTasks = async (req: AuthRequest, res: Response) => {
    const { id: user_id, organization_id, department_id, role } = req.user!;
    const statusParam = req.query.status as string | undefined;

    const where: any = {
        project: {
            organization_id,
            deleted_at: null
        }
    };

    const roleLC = role.toLowerCase();
    if (roleLC === "koordinator") {
        where.project.department_id = department_id;
    } else if (roleLC === "staff") {
        where.assigned_to = user_id;
    }

    if (statusParam) where.status = statusParam as TaskStatus;

    try {
        const tasks = await prisma.task.findMany({
            where,
            include: taskInclude,
            orderBy: { created_at: "desc" },
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil daftar task",
            data: tasks.map(mapTaskResponse),
        });
    } catch (error) {
        console.error("getAllTasks error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// 3. GET TASK DETAIL
// ─────────────────────────────────────────────

export const getTaskById = async (req: AuthRequest, res: Response) => {
    const id = paramStr(req.params.id);
    const { id: user_id, organization_id, role } = req.user!;

    try {
        const task = await prisma.task.findFirst({
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
    } catch (error) {
        console.error("getTaskById error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// 4. UPDATE TASK
// ─────────────────────────────────────────────

export const updateTask = async (req: AuthRequest, res: Response) => {
    const id = paramStr(req.params.id);
    const { id: actor_id, organization_id, role } = req.user!;

    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed);

    const { title, description, story_point, deadline, status } = parsed.data;

    try {
        const task = await prisma.task.findFirst({
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
            if (status === TaskStatus.DELIVERED && !isAdminOrKoordinator(role)) {
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

        let deadlineDate: Date | undefined;
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

        const updated = await prisma.$transaction(async (tx) => {
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
            } else {
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
    } catch (error) {
        console.error("updateTask error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// 5. DELETE TASK
// ─────────────────────────────────────────────

export const deleteTask = async (req: AuthRequest, res: Response) => {
    const id = paramStr(req.params.id);
    const { organization_id, role } = req.user!;

    if (!isAdmin(role)) {
        return res.status(403).json({
            success: false,
            message: "Hanya Admin yang dapat menghapus task",
        });
    }

    try {
        const task = await prisma.task.findFirst({
            where: {
                id,
                project: { organization_id }
            },
        });

        if (!task) {
            return res.status(404).json({ success: false, message: "Task tidak ditemukan" });
        }

        if (task.status === TaskStatus.DELIVERED) {
            return res.status(400).json({
                success: false,
                message: "Task dengan status DELIVERED tidak dapat dihapus",
            });
        }

        await prisma.task.delete({ where: { id } });

        return res.status(200).json({
            success: true,
            message: "Task berhasil dihapus",
            data: null,
        });
    } catch (error) {
        console.error("deleteTask error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// 6. ASSIGN TASK
// ─────────────────────────────────────────────

export const assignTask = async (req: AuthRequest, res: Response) => {
    const id = paramStr(req.params.id);
    const { id: actor_id, organization_id, role } = req.user!;

    if (!isAdminOrKoordinator(role)) {
        return res.status(403).json({
            success: false,
            message: "Hanya Admin/Koordinator yang dapat assign task",
        });
    }

    const parsed = assignTaskSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed);

    const { assigned_to } = parsed.data;

    try {
        const task = await prisma.task.findFirst({
            where: {
                id,
                project: { organization_id, deleted_at: null }
            },
        });

        if (!task) {
            return res.status(404).json({ success: false, message: "Task tidak ditemukan" });
        }

        if (task.status === TaskStatus.DELIVERED) {
            return res.status(400).json({
                success: false,
                message: "Task dengan status DELIVERED tidak dapat di-assign",
            });
        }

        const assignee = await prisma.user.findFirst({
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

        const [updatedTask] = await prisma.$transaction([
            prisma.task.update({
                where: { id },
                data: { assigned_to },
                include: taskInclude,
            }),
            prisma.taskLog.create({
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
    } catch (error) {
        console.error("assignTask error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
