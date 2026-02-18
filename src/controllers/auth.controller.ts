import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

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
    organization_phone?: unknown;
    organizationName?: unknown;
    organizationAddress?: unknown;
    phoneNumber?: unknown;
  };

  const email = body.email;
  const name = body.name;
  const password = body.password;
  const organizationName = body.organization_name ?? body.organizationName;
  const organizationAddress =
    body.organization_address ?? body.organizationAddress;
  const organizationPhone = body.organization_phone ?? body.phoneNumber;

  if (
    typeof email !== "string" ||
    typeof name !== "string" ||
    typeof password !== "string" ||
    typeof organizationName !== "string" ||
    typeof organizationAddress !== "string" ||
    typeof organizationPhone !== "string"
  ) {
    return res.status(400).json({
      message:
        "Email, name, password, organization_name, organization_address, and organization_phone are required",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();
  const trimmedOrgName = organizationName.trim();
  const trimmedOrgAddress = organizationAddress.trim();
  const trimmedOrgPhone = organizationPhone.trim();

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

  if (!PHONE_REGEX.test(trimmedOrgPhone)) {
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
          phone: trimmedOrgPhone,
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
          password: passwordHash,
          organization_id: organization.id,
          department_id: department.id,
          role_id: role.id,
        },
        select: {
          id: true,
          email: true,
          name: true,
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
  } catch (error) {
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

  const normalizedEmail = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const { password: _, ...userWithoutPassword } = user;

    const token = jwt.sign(
      { id: userWithoutPassword.id, email: userWithoutPassword.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Login success",
      token,
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
