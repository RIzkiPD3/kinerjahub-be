import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

/**
 * GET ALL USERS (Admin Only)
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        organization_id: true,
        department_id: true,
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
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
const SALT_ROUNDS = 10;

export const register = async (req: Request, res: Response) => {
  const body = req.body as {
    email?: unknown;
    name?: unknown;
    password?: unknown;
    organization_name?: unknown;
    organization_address?: unknown;
    phone_number?: unknown;
    organizationName?: unknown;
    organizationAddress?: unknown;
    phoneNumber?: unknown;
    no_handphone?: unknown;
  };

  const email = body.email;
  const name = body.name;
  const password = body.password;
  const organizationName = body.organization_name ?? body.organizationName;
  const organizationAddress =
    body.organization_address ?? body.organizationAddress;
  const phoneNumber = body.phone_number ?? body.phoneNumber ?? body.no_handphone;

  if (
    typeof email !== "string" ||
    typeof name !== "string" ||
    typeof password !== "string" ||
    typeof organizationName !== "string" ||
    typeof organizationAddress !== "string" ||
    typeof phoneNumber !== "string"
  ) {
    return res.status(400).json({
      message:
        "Email, name, password, organization_name, organization_address, and phone_number are required",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();
  const trimmedOrgName = organizationName.trim();
  const trimmedOrgAddress = organizationAddress.trim();
  const trimmedPhoneNumber = phoneNumber.trim();

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  if (trimmedName.length === 0) {
    return res.status(400).json({ message: "Name cannot be empty" });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters" });
  }

  if (trimmedOrgName.length === 0) {
    return res.status(400).json({ message: "Organization name cannot be empty" });
  }

  if (trimmedOrgAddress.length === 0) {
    return res
      .status(400)
      .json({ message: "Organization address cannot be empty" });
  }

  if (!PHONE_REGEX.test(trimmedPhoneNumber)) {
    return res.status(400).json({ message: "Invalid phone number format" });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: trimmedOrgName,
          address: trimmedOrgAddress,
        },
      });

      const division = await tx.division.create({
        data: {
          organization_id: organization.id,
          name: "Default Division",
        },
      });

      const department = await tx.department.create({
        data: {
          organization_id: organization.id,
          division_id: division.id,
          name: "Default Department",
        },
      });

      const role = await tx.role.create({
        data: {
          organization_id: organization.id,
          name: "Admin",
        },
      });

      return tx.user.create({
        data: {
          email: normalizedEmail,
          name: trimmedName,
          phone_number: trimmedPhoneNumber,
          password: passwordHash,
          organization_id: organization.id,
          department_id: department.id,
          role_id: role.id,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone_number: true,
          organization_id: true,
          department_id: true,
          role_id: true,
          created_at: true,
          updated_at: true,
        },
      });
    });

    return res.status(201).json({
      message: "Register success",
      data: result,
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    console.error("Register error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
interface JwtPayload {
  id: number;
  email: string;
  role: string;
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as {
    email?: unknown;
    password?: unknown;
  };

  if (typeof email !== "string" || typeof password !== "string") {
    return res
      .status(400)
      .json({ message: "Email and password are required" });
  }
};

/**
 * GET USER BY ID
 */
export const getUserById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        organization_id: true,
        department_id: true,
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
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * CREATE USER
 */
export const createUser = async (req: Request, res: Response) => {
  const { name, email, password, organization_id, department_id, role_id } =
    req.body;

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        organization_id,
        department_id,
        role_id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role_id: true,
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const { password: _, ...userWithoutPassword } = user;

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role.name, // 🔥 sekarang JWT bawa role
      },
    });

    return res.status(201).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * UPDATE USER
 */
export const updateUser = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, email, password, role_id } = req.body;

  try {
    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    let hashedPassword = existing.password;

    if (password) {
      hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        password: hashedPassword,
        role_id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role_id: true,
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * DELETE USER
 */
export const deleteUser = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    await prisma.user.delete({
      where: { id },
    });

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
  } catch (error: unknown) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
