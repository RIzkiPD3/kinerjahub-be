import { Response } from "express";
import { z } from "zod";
import { ProjectStatus, TaskStatus } from "@prisma/client";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

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

const createProjectSchema = z.object({
    name: z.string().min(1, "Nama project wajib diisi").max(200, "Nama project maksimal 200 karakter"),
    description: z.string().optional(),
    division_id: z.string().uuid("division_id harus berupa UUID yang valid"),
    department_id: z.string().uuid("department_id harus berupa UUID yang valid"),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
});

const updateProjectSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional().nullable(),
    status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
});

// ─────────────────────────────────────────────
// Project include helper
// ─────────────────────────────────────────────

const projectInclude = {
    division: { select: { id: true, name: true } },
    department: { select: { id: true, name: true } },
    organization: { select: { id: true, name: true } },
};

// ─────────────────────────────────────────────
// Statistics helper
// ─────────────────────────────────────────────

function projectStats(tasks: { status: TaskStatus }[]) {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
        (t) => t.status === TaskStatus.DELIVERED || t.status === TaskStatus.DONE
    ).length;
    const progressPercentage =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return { totalTasks, completedTasks, progressPercentage };
}

// ─────────────────────────────────────────────
// 1. CREATE PROJECT
// ─────────────────────────────────────────────

export const createProject = async (req: AuthRequest, res: Response) => {
    const { id: actor_id, organization_id, role } = req.user!;

    if (!isAdminOrKoordinator(role)) {
        return res.status(403).json({
            success: false,
            message: "Hanya Admin dan Koordinator yang dapat membuat project",
        });
    }

    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed);

    const { name, description, division_id, department_id, start_date, end_date } = parsed.data;

    try {
        // Validate division belongs to org
        const division = await prisma.division.findFirst({
            where: { id: division_id, organization_id },
        });
        if (!division) {
            return res.status(404).json({
                success: false,
                message: "Divisi tidak ditemukan atau tidak sesuai dengan organisasi Anda",
            });
        }

        // Validate department belongs to org and division
        const department = await prisma.department.findFirst({
            where: { id: department_id, organization_id, division_id },
        });
        if (!department) {
            return res.status(404).json({
                success: false,
                message: "Departemen tidak ditemukan atau tidak sesuai dengan divisi yang dipilih",
            });
        }

        const project = await prisma.project.create({
            data: {
                name,
                description,
                organization_id,
                division_id,
                department_id,
                start_date: start_date ? new Date(start_date) : undefined,
                end_date: end_date ? new Date(end_date) : undefined,
                status: ProjectStatus.ACTIVE,
            },
            include: projectInclude,
        });

        return res.status(201).json({
            success: true,
            message: "Project berhasil dibuat",
            data: project,
        });
    } catch (error) {
        console.error("createProject error:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
};

// ─────────────────────────────────────────────
// 2. GET ALL PROJECTS
// ─────────────────────────────────────────────

export const getAllProjects = async (req: AuthRequest, res: Response) => {
    const { organization_id, role, department_id: userDeptId } = req.user!;

    const statusParam = req.query.status as string | undefined;
    const where: any = { organization_id, deleted_at: null };

    // Koordinator only sees projects for their department
    if (role.toLowerCase() === "koordinator") {
        where.department_id = userDeptId;
    }

    if (statusParam) where.status = statusParam as ProjectStatus;

    try {
        const projects = await prisma.project.findMany({
            where,
            include: {
                ...projectInclude,
                tasks: { select: { status: true } },
            },
            orderBy: { created_at: "desc" },
        });

        const data = projects.map((p) => {
            const { tasks, ...rest } = p;
            return { ...rest, ...projectStats(tasks) };
        });

        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil daftar project",
            data,
        });
    } catch (error) {
        console.error("getAllProjects error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// 3. GET PROJECT DETAIL
// ─────────────────────────────────────────────

export const getProjectById = async (req: AuthRequest, res: Response) => {
    const id = paramStr(req.params.id);
    const { organization_id } = req.user!;

    try {
        const project = await prisma.project.findFirst({
            where: { id, organization_id, deleted_at: null },
            include: {
                ...projectInclude,
                tasks: {
                    include: {
                        assignee: { select: { id: true, name: true, email: true } },
                        creator: { select: { id: true, name: true, email: true } },
                    },
                    orderBy: { created_at: "desc" },
                },
            },
        });

        if (!project) {
            return res.status(404).json({ success: false, message: "Project tidak ditemukan" });
        }

        const { tasks, ...rest } = project;
        const stats = projectStats(tasks);

        // Flatten tasks with project info
        const tasksWithProjectInfo = tasks.map((t) => ({
            ...t,
            projectName: rest.name,
            divisionName: rest.division.name,
            departmentName: rest.department.name,
        }));

        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil detail project",
            data: {
                ...rest,
                ...stats,
                tasks: tasksWithProjectInfo,
            },
        });
    } catch (error) {
        console.error("getProjectById error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// 4. UPDATE PROJECT
// ─────────────────────────────────────────────

export const updateProject = async (req: AuthRequest, res: Response) => {
    const id = paramStr(req.params.id);
    const { organization_id, role } = req.user!;

    if (!isAdminOrKoordinator(role)) {
        return res.status(403).json({
            success: false,
            message: "Hanya Admin dan Koordinator yang dapat mengubah project",
        });
    }

    const parsed = updateProjectSchema.safeParse(req.body);
    if (!parsed.success) return handleZodError(res, parsed);

    const { name, description, status, start_date, end_date } = parsed.data;

    try {
        const project = await prisma.project.findFirst({
            where: { id, organization_id, deleted_at: null },
        });

        if (!project) {
            return res.status(404).json({ success: false, message: "Project tidak ditemukan" });
        }

        const updated = await prisma.project.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(status !== undefined && { status }),
                ...(start_date !== undefined && {
                    start_date: start_date ? new Date(start_date) : null,
                }),
                ...(end_date !== undefined && {
                    end_date: end_date ? new Date(end_date) : null,
                }),
            },
            include: projectInclude,
        });

        return res.status(200).json({
            success: true,
            message: "Project berhasil diupdate",
            data: updated,
        });
    } catch (error) {
        console.error("updateProject error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─────────────────────────────────────────────
// 5. DELETE PROJECT (Soft Delete)
// ─────────────────────────────────────────────

export const deleteProject = async (req: AuthRequest, res: Response) => {
    const id = paramStr(req.params.id);
    const { organization_id, role } = req.user!;

    if (!isAdmin(role)) {
        return res.status(403).json({
            success: false,
            message: "Hanya Admin yang dapat menghapus project",
        });
    }

    try {
        const project = await prisma.project.findFirst({
            where: { id, organization_id, deleted_at: null },
        });

        if (!project) {
            return res.status(404).json({ success: false, message: "Project tidak ditemukan" });
        }

        await prisma.project.update({
            where: { id },
            data: { deleted_at: new Date() },
        });

        return res.status(200).json({
            success: true,
            message: "Project berhasil dihapus",
            data: null,
        });
    } catch (error) {
        console.error("deleteProject error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
