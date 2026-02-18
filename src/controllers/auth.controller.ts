import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10;

export const register = async (req: Request, res: Response) => {
  const {
    email,
    name,
    password,
    organization_name,
    organization_address,
    organization_phone,
  } = req.body as {
    email?: unknown;
    name?: unknown;
    password?: unknown;
    organization_name?: unknown;
    organization_address?: unknown;
    organization_phone?: unknown;
  };

  // Validation: Check all required fields are present and of correct type
  if (
    typeof email !== "string" ||
    typeof name !== "string" ||
    typeof password !== "string" ||
    typeof organization_name !== "string" ||
    typeof organization_address !== "string" ||
    typeof organization_phone !== "string"
  ) {
    return res.status(400).json({
      message:
        "Email, name, password, organization_name, organization_address, and organization_phone are required",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();
  const trimmedOrgName = organization_name.trim();
  const trimmedOrgAddress = organization_address.trim();
  const trimmedOrgPhone = organization_phone.trim();

  // Validate email format
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({
      message: "Invalid email format",
    });
  }

  // Validate name is not empty
  if (trimmedName.length === 0) {
    return res.status(400).json({
      message: "Name cannot be empty",
    });
  }

  // Validate password length
  if (password.length < 8) {
    return res.status(400).json({
      message: "Password must be at least 8 characters",
    });
  }

  // Validate organization fields are not empty
  if (trimmedOrgName.length === 0) {
    return res.status(400).json({
      message: "Organization name cannot be empty",
    });
  }

  if (trimmedOrgAddress.length === 0) {
    return res.status(400).json({
      message: "Organization address cannot be empty",
    });
  }

  if (trimmedOrgPhone.length === 0) {
    return res.status(400).json({
      message: "Organization phone cannot be empty",
    });
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Use transaction to create Organization, Division, Department, Role, and User
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const organization = await tx.organization.create({
        data: {
          name: trimmedOrgName,
          address: trimmedOrgAddress,
          phone: trimmedOrgPhone,
        },
      });

      // 2. Create default Division for the organization
      const division = await tx.division.create({
        data: {
          organization_id: organization.id,
          name: "Default Division",
        },
      });

      // 3. Create default Department for the division
      const department = await tx.department.create({
        data: {
          organization_id: organization.id,
          division_id: division.id,
          name: "Default Department",
        },
      });

      // 4. Create default Role for the organization
      const role = await tx.role.create({
        data: {
          organization_id: organization.id,
          name: "Admin",
        },
      });

      // 5. Create User with all the IDs from above
      const user = await tx.user.create({
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

      return user;
    });

    return res.status(201).json({
      message: "Register success",
      data: result,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return res.status(409).json({
          message: "Email is already registered",
        });
      }
    }

    console.error("Register error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as {
    email?: unknown;
    password?: unknown;
  };

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    // Generate JWT token
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
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
