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
    if (result.success) return res; // Should not happen
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
    department_id: z.string().uuid("department_id harus berupa UUID yang valid"),
    assigned_to: z.string().uuid("assigned_to harus berupa UUID yang valid").optional().nullable(),
    story_point: z
        .coerce.number()
        .int("Story point harus berupa bilangan bulat")
        .min(1, "Story point minimal 1")
        .max(10, "Story point maksimal 10"),
    deadline: z
        .string()
        .min(1, "Deadline wajib diisi")
        .refine(
            (val) => !isNaN(new Date(val).getTime()),
            "Deadline harus berupa format tanggal ISO yang valid"
        ),
});

const updateTaskSchema = z.object({
    title: z.string().min(1, "Judul minimal 1 karakter").max(150, "Judul maksimal 150 karakter").optional(),
    description: z.string().optional(),
    story_point: z
        .coerce.number()
        .int("Story point harus berupa bilangan bulat")
        .min(1, "Story point minimal 1")
        .optional(),
    deadline: z
        .string()
        .refine((val) => !isNaN(new Date(val).getTime()), "Deadline tidak valid")
        .optional(),
    status: z.nativeEnum(TaskStatus).optional(),
});

const assignTaskSchema = z.object({
    assigned_to: z.string().uuid("assigned_to harus UUID yang valid"),
});

// ─────────────────────────────────────────────
// 1. CREATE TASK
// ─────────────────────────────────────────────

export const createTask = async (req: AuthRequest, res: Response) => {
    const { id: actor_id, organization_id, role } = req.user!;

    if (!isAdminOrKoordinator(role)) {
        return res.status(403).json({
            success: false,
            message: "Hanya Admin dan Koordinator yang dapat membuat task",
        });
    }

    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed);

    const { title, description, department_id, assigned_to, story_point, deadline } = parsed.data;

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
        const department = await prisma.department.findFirst({
            where: { id: department_id, organization_id },
        });

        if (!department) {
            return res.status(404).json({
                success: false,
                message: "Departemen tidak ditemukan atau tidak sesuai dengan organisasi Anda",
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

        // Transaction: Create Task + Initial Log
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
                    organization_id,
                    department_id,
                },
                include: {
                    creator: { select: { id: true, name: true, email: true } },
                    assignee: { select: { id: true, name: true, email: true } },
                    department: {
                        select: {
                            id: true,
                            name: true,
                            division: { select: { id: true, name: true } }
                        }
                    },
                    organization: { select: { id: true, name: true } },
                },
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
            data: {
                ...task,
                division: (task.department as any)?.division
            },
        });
    } catch (error) {
        console.error("createTask error:", error);
        return res
            .status(500)
            .json({ success: false, message: "Terjadi kesalahan pada server saat membuat task" });
    }
};

// ─────────────────────────────────────────────
// 2. GET ALL TASKS
// ─────────────────────────────────────────────

export const getAllTasks = async (req: AuthRequest, res: Response) => {
    const { id: user_id, organization_id, department_id, role } = req.user!;

    const statusParam = req.query.status as string | undefined;
    const assignedToParam = req.query.assigned_to as string | undefined;
    const deptIdParam = req.query.department_id as string | undefined;

    const roleLC = role.toLowerCase();
    const where: any = { organization_id };

    if (roleLC === "admin") {
        if (deptIdParam) where.department_id = deptIdParam;
    } else if (roleLC === "koordinator") {
        where.department_id = department_id;
    } else {
        where.assigned_to = user_id;
    }

    if (statusParam) where.status = statusParam as TaskStatus;
    if (assignedToParam && roleLC !== "staff") {
        where.assigned_to = assignedToParam;
    }

    try {
        const tasks = await prisma.task.findMany({
            where,
            include: {
                creator: { select: { id: true, name: true, email: true } },
                assignee: { select: { id: true, name: true, email: true } },
                department: {
                    select: {
                        id: true,
                        name: true,
                        division: { select: { id: true, name: true } }
                    }
                },
            },
            orderBy: { created_at: "desc" },
        });

        const mappedTasks = tasks.map(t => ({
            ...t,
            division: (t.department as any)?.division
        }));

        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil daftar task",
            data: mappedTasks,
        });
    } catch (error) {
        console.error("getAllTasks error:", error);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
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
            where: { id, organization_id },
            include: {
                creator: { select: { id: true, name: true, email: true } },
                assignee: { select: { id: true, name: true, email: true } },
                department: {
                    select: {
                        id: true,
                        name: true,
                        division: { select: { id: true, name: true } }
                    }
                },
                organization: { select: { id: true, name: true } },
                task_logs: {
                    include: { user: { select: { id: true, name: true } } },
                    orderBy: { created_at: "desc" },
                },
            },
        });

        if (!task) {
            return res
                .status(404)
                .json({ success: false, message: "Task tidak ditemukan" });
        }

        if (role.toLowerCase() === "staff" && task.assigned_to !== user_id) {
            return res.status(403).json({
                success: false,
                message: "Anda tidak memiliki akses ke task ini",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil detail task",
            data: {
                ...task,
                division: (task.department as any)?.division
            },
        });
    } catch (error) {
        console.error("getTaskById error:", error);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
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
            where: { id, organization_id },
        });

        if (!task) {
            return res
                .status(404)
                .json({ success: false, message: "Task tidak ditemukan" });
        }

        const roleLC = role.toLowerCase();

        // Staff check
        if (roleLC === "staff" && task.assigned_to !== actor_id) {
            return res.status(403).json({
                success: false,
                message: "Anda tidak memiliki akses ke task ini",
            });
        }

        // Status flow validation
        if (status !== undefined && status !== task.status) {
            const validNext = VALID_TRANSITIONS[task.status] || [];
            const isValidTransition = validNext.includes(status);

            if (!isValidTransition && !isAdminOrKoordinator(role)) {
                return res.status(400).json({
                    success: false,
                    message: `Status tidak valid. Dari ${task.status}, status hanya bisa berubah ke: ${validNext.length > 0 ? validNext.join(", ") : "(tidak ada)"}`,
                });
            }

            if (status === TaskStatus.DELIVERED && !isAdminOrKoordinator(role)) {
                return res.status(403).json({
                    success: false,
                    message: "Hanya Admin/Koordinator yang bisa mengubah status ke DELIVERED",
                });
            }
        }

        // Deadline check
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

        // Transaction for update + logging status changes
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
                include: {
                    creator: { select: { id: true, name: true, email: true } },
                    assignee: { select: { id: true, name: true, email: true } },
                    department: {
                        select: {
                            id: true,
                            name: true,
                            division: { select: { id: true, name: true } }
                        }
                    },
                },
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
            } else if (Object.keys(parsed.data).length > 0) {
                // If it's not a status change but other fields were updated
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
            data: {
                ...updated,
                division: (updated.department as any)?.division
            },
        });
    } catch (error) {
        console.error("updateTask error:", error);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
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
            where: { id, organization_id },
        });

        if (!task) {
            return res
                .status(404)
                .json({ success: false, message: "Task tidak ditemukan" });
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
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
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
            where: { id, organization_id },
        });

        if (!task) {
            return res
                .status(404)
                .json({ success: false, message: "Task tidak ditemukan" });
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
                department_id: task.department_id,
            },
            select: { id: true, name: true, email: true },
        });

        if (!assignee) {
            return res.status(400).json({
                success: false,
                message:
                    "User yang dituju tidak ditemukan atau bukan dari department yang sama",
            });
        }

        const [updatedTask] = await prisma.$transaction([
            prisma.task.update({
                where: { id },
                data: { assigned_to },
                include: {
                    creator: { select: { id: true, name: true, email: true } },
                    assignee: { select: { id: true, name: true, email: true } },
                    department: {
                        select: {
                            id: true,
                            name: true,
                            division: { select: { id: true, name: true } }
                        }
                    },
                },
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
            data: {
                ...updatedTask,
                division: (updatedTask.department as any)?.division
            },
        });
    } catch (error) {
        console.error("assignTask error:", error);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
    }
};
