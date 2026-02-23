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
    return res.status(401).json({ message: "Unauthorized - Organization context missing" });
  }

  // 1. Basic Validation
  if (!name || !email || !password || !phone_number || !division_id || !department_id || !role_id) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  try {
    // 2. Resource Existence & Ownership Checks
    const [existingEmail, division, department, role] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.division.findFirst({ where: { id: division_id, organization_id } }),
      prisma.department.findFirst({
        where: {
          id: department_id,
          division_id,
          organization_id
        }
      }),
      prisma.role.findFirst({ where: { id: role_id, organization_id } }),
    ]);

    if (existingEmail) {
      return res.status(409).json({ message: "Email already exists" });
    }

    if (!division) {
      return res.status(400).json({ message: "Invalid division or access denied" });
    }

    if (!department) {
      return res.status(400).json({ message: "Invalid department or it doesn't belong to the specified division" });
    }

    if (!role) {
      return res.status(400).json({ message: "Invalid role or access denied" });
    }

    // 3. Security (Hashing)
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 4. Create User
    const user = await prisma.user.create({
      data: {
        name,
        email,
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

    return res.status(201).json({
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    console.error("Create user error:", error);
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
