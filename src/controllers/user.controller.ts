import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import prisma from "../lib/prisma";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

/**
 * GET ALL USERS (Admin Only)
 */
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const organization_id = req.user?.organization_id;

    if (!organization_id) {
      return res.status(401).json({ message: "Unauthorized - Organization not found" });
    }

    const users = await prisma.user.findMany({
      where: {
        organization_id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone_number: true,
        organization_id: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        division: {
          select: {
            id: true,
            name: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        created_at: true,
      },
    });

    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * GET USER BY ID
 */
export const getUserById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const organization_id = req.user?.organization_id;

    if (!organization_id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: Array.isArray(id) ? id[0] : id,
        organization_id
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone_number: true,
        organization_id: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        division: {
          select: {
            id: true,
            name: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * CREATE USER (Admin Only)
 */
export const createUser = async (req: AuthRequest, res: Response) => {
  // [DEBUG LOG] Tampilkan seluruh body yang diterima dari frontend
  console.log("[CREATE_USER] req.body:", JSON.stringify(req.body, null, 2));

  const {
    name,
    email,
    password,
    phone_number,
    division_id,
    department_id,
    role_id,
  } = req.body;

  const organization_id = req.user?.organization_id;

  if (!organization_id) {
    console.warn("[CREATE_USER] 401: organization_id missing from JWT token");
    return res.status(401).json({ message: "Unauthorized - Organization context missing" });
  }

  // 1. Validasi field per field — agar respons 400 lebih deskriptif
  const missingFields: string[] = [];
  if (!name) missingFields.push("name");
  if (!email) missingFields.push("email");
  if (!password) missingFields.push("password");
  if (!phone_number) missingFields.push("phone_number");
  if (!division_id) missingFields.push("division_id");
  if (!department_id) missingFields.push("department_id");
  if (!role_id) missingFields.push("role_id");

  if (missingFields.length > 0) {
    console.warn("[CREATE_USER] 400: Missing required fields:", missingFields);
    return res.status(400).json({
      message: "Missing required fields",
      missing_fields: missingFields,
    });
  }

  // Normalize email ke lowercase agar konsisten
  const normalizedEmail = (email as string).trim().toLowerCase();
  console.log("[CREATE_USER] Normalized email:", normalizedEmail);

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    console.warn("[CREATE_USER] 400: Invalid email format:", normalizedEmail);
    return res.status(400).json({ message: "Invalid email format" });
  }

  if ((password as string).length < 8) {
    console.warn("[CREATE_USER] 400: Password too short, length:", (password as string).length);
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  try {
    // 2. Cek eksistensi resource secara paralel
    console.log("[CREATE_USER] Checking FK: division_id=%s, department_id=%s, role_id=%s, organization_id=%s",
      division_id, department_id, role_id, organization_id);

    const [existingEmail, division, department, role] = await Promise.all([
      prisma.user.findUnique({ where: { email: normalizedEmail } }),
      prisma.division.findFirst({ where: { id: division_id, organization_id } }),
      // BUG FIX: Hapus filter division_id dari department query.
      // Department cukup dicek berdasarkan organization_id saja.
      // Filter division_id bisa menyebabkan 400 jika dept terdaftar di org
      // tapi relasi division_id di skema berbeda dari yang dikirim frontend.
      prisma.department.findFirst({
        where: {
          id: department_id,
          organization_id,
        },
      }),
      prisma.role.findFirst({ where: { id: role_id, organization_id } }),
    ]);

    // [DEBUG LOG] Tampilkan hasil masing-masing FK check
    console.log("[CREATE_USER] email conflict:", existingEmail ? "YES - email taken" : "NO");
    console.log("[CREATE_USER] division found:", division ? `YES (${division.name})` : "NO");
    console.log("[CREATE_USER] department found:", department ? `YES (${department.name})` : "NO");
    console.log("[CREATE_USER] role found:", role ? `YES (${role.name})` : "NO");

    if (existingEmail) {
      console.warn("[CREATE_USER] 409: Email already registered:", normalizedEmail);
      return res.status(409).json({ message: "Email already exists" });
    }

    if (!division) {
      console.warn("[CREATE_USER] 400: Division not found or not in org. division_id:", division_id);
      return res.status(400).json({
        message: "Division not found or doesn't belong to your organization",
        field: "division_id",
        value: division_id,
      });
    }

    if (!department) {
      console.warn("[CREATE_USER] 400: Department not found or not in org. department_id:", department_id);
      return res.status(400).json({
        message: "Department not found or doesn't belong to your organization",
        field: "department_id",
        value: department_id,
      });
    }

    if (!role) {
      console.warn("[CREATE_USER] 400: Role not found or not in org. role_id:", role_id);
      return res.status(400).json({
        message: "Role not found or doesn't belong to your organization",
        field: "role_id",
        value: role_id,
      });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    console.log("[CREATE_USER] Password hashed successfully");

    // 4. Buat user
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        phone_number,
        password: hashedPassword,
        organization_id,
        division_id,
        department_id,
        role_id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone_number: true,
        organization: { select: { id: true, name: true } },
        division: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        role: { select: { id: true, name: true } },
        created_at: true,
      },
    });

    console.log("[CREATE_USER] User created successfully, id:", user.id);

    return res.status(201).json({
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    console.error("[CREATE_USER] Unexpected error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * UPDATE USER
 */
export const updateUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, password, department_id, division_id, role_id } = req.body;

  try {
    const organization_id = req.user?.organization_id;

    if (!organization_id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = Array.isArray(id) ? id[0] : id;

    const existing = await prisma.user.findFirst({
      where: {
        id: userId,
        organization_id
      },
    });

    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    let hashedPassword = existing.password;

    if (password) {
      hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        password: hashedPassword,
        department_id,
        division_id,
        role_id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone_number: true,
        organization_id: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        division: {
          select: {
            id: true,
            name: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * DELETE USER (Admin Only)
 */
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.user.delete({
      where: { id: Array.isArray(id) ? id[0] : id },
    });

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
