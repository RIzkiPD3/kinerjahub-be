import { Response } from "express";
import { z } from "zod";
import { TaskStatus } from "@prisma/client";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const STATUS_FLOW: Record<TaskStatus, TaskStatus | null> = {
    TO_DO: TaskStatus.IN_PROGRESS,
    IN_PROGRESS: TaskStatus.DONE,
    DONE: TaskStatus.DELIVERED,
    DELIVERED: null,
};

function isAdminOrKoordinator(role: string): boolean {
    const r = role.toLowerCase();
    return r === "admin" || r === "koordinator";
}

function isAdmin(role: string): boolean {
    return role.toLowerCase() === "admin";
}

function asString(val: unknown): string | undefined {
    if (typeof val === "string") return val;
    if (Array.isArray(val) && typeof val[0] === "string") return val[0];
    return undefined;
}

function paramStr(val: string | string[]): string {
    return Array.isArray(val) ? val[0] : val;
}

// ─────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────

const createTaskSchema = z.object({
    title: z
        .string()
        .min(1, "Title wajib diisi")
        .max(150, "Title maksimal 150 karakter"),
    description: z.string().optional(),
    story_point: z.number().int().min(1, "Story point minimal 1"),
    deadline: z.string().refine(
        (val) => !isNaN(new Date(val).getTime()),
        "Deadline harus berupa tanggal yang valid"
    ),
});

const updateTaskSchema = z.object({
    title: z.string().min(1).max(150).optional(),
    description: z.string().optional(),
    story_point: z.number().int().min(1).optional(),
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
    const { id: created_by, organization_id, department_id, role } = req.user!;

    if (!isAdminOrKoordinator(role)) {
        return res.status(403).json({
            success: false,
            message: "Hanya Admin dan Koordinator yang dapat membuat task",
        });
    }

    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: parsed.error.issues[0].message,
        });
    }

    const { title, description, story_point, deadline } = parsed.data;

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
        const task = await prisma.task.create({
            data: {
                title,
                description,
                story_point,
                deadline: deadlineDate,
                status: TaskStatus.TO_DO,
                assigned_to: undefined,
                created_by,
                organization_id,
                department_id,
            },
            include: {
                creator: { select: { id: true, name: true, email: true } },
                department: { select: { id: true, name: true } },
                organization: { select: { id: true, name: true } },
            },
        });

        return res.status(201).json({
            success: true,
            message: "Task berhasil dibuat",
            data: task,
        });
    } catch (error) {
        console.error("createTask error:", error);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// 2. GET ALL TASKS
// ─────────────────────────────────────────────

export const getAllTasks = async (req: AuthRequest, res: Response) => {
    const { id: user_id, organization_id, department_id, role } = req.user!;

    const statusParam = asString(req.query.status);
    const assignedToParam = asString(req.query.assigned_to);
    const deptIdParam = asString(req.query.department_id);

    const roleLC = role.toLowerCase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { organization_id };

    if (roleLC === "admin") {
        if (deptIdParam) where.department_id = deptIdParam;
    } else if (roleLC === "koordinator") {
        where.department_id = department_id;
    } else {
        // Staff: hanya task miliknya
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
                department: { select: { id: true, name: true } },
            },
            orderBy: { created_at: "desc" },
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil daftar task",
            data: tasks,
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
                department: { select: { id: true, name: true } },
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

        // Staff hanya boleh lihat task miliknya
        if (role.toLowerCase() === "staff" && task.assigned_to !== user_id) {
            return res.status(403).json({
                success: false,
                message: "Anda tidak memiliki akses ke task ini",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil detail task",
            data: task,
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
    const { id: user_id, organization_id, role } = req.user!;

    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: parsed.error.issues[0].message,
        });
    }

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

        // Staff hanya boleh update task miliknya
        if (roleLC === "staff" && task.assigned_to !== user_id) {
            return res.status(403).json({
                success: false,
                message: "Anda tidak memiliki akses ke task ini",
            });
        }

        // Validasi status flow
        if (status !== undefined) {
            const allowedNext = STATUS_FLOW[task.status];

            if (status !== allowedNext) {
                return res.status(400).json({
                    success: false,
                    message: `Status hanya bisa berubah dari ${task.status} ke ${allowedNext ?? "(tidak ada)"}`,
                });
            }

            // Staff tidak boleh set status DELIVERED
            if (status === TaskStatus.DELIVERED && !isAdminOrKoordinator(role)) {
                return res.status(403).json({
                    success: false,
                    message: "Hanya Admin/Koordinator yang bisa mengubah status ke DELIVERED",
                });
            }
        }

        // Deadline hanya boleh diubah Admin/Koordinator
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

        const updated = await prisma.task.update({
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
                department: { select: { id: true, name: true } },
            },
        });

        return res.status(200).json({
            success: true,
            message: "Task berhasil diupdate",
            data: updated,
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
    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            message: parsed.error.issues[0].message,
        });
    }

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

        // Verifikasi assignee ada di department yang sama
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

        // Transaction: update task + create log
        const [updatedTask] = await prisma.$transaction([
            prisma.task.update({
                where: { id },
                data: { assigned_to },
                include: {
                    creator: { select: { id: true, name: true, email: true } },
                    assignee: { select: { id: true, name: true, email: true } },
                    department: { select: { id: true, name: true } },
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
            data: updatedTask,
        });
    } catch (error) {
        console.error("assignTask error:", error);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
    }
};
