import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { Prisma } from "../generated/prisma/client";
import prisma from "../lib/prisma";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
const SALT_ROUNDS = 10;

export const register = async (req: Request, res: Response) => {
  const { email, name, password, organizationName, organizationAddress, phoneNumber } =
    req.body as {
    email?: unknown;
    name?: unknown;
    password?: unknown;
    organizationName?: unknown;
    organizationAddress?: unknown;
    phoneNumber?: unknown;
  };

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
        "Email, name, password, organizationName, organizationAddress, and phoneNumber are required",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();
  const normalizedOrganizationName = organizationName.trim();
  const normalizedOrganizationAddress = organizationAddress.trim();
  const normalizedPhoneNumber = phoneNumber.trim();

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({
      message: "Invalid email format",
    });
  }

  if (!normalizedName) {
    return res.status(400).json({
      message: "Name is required",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      message: "Password must be at least 8 characters",
    });
  }

  if (!normalizedOrganizationName) {
    return res.status(400).json({
      message: "Organization name is required",
    });
  }

  if (!normalizedOrganizationAddress) {
    return res.status(400).json({
      message: "Organization address is required",
    });
  }

  if (!PHONE_REGEX.test(normalizedPhoneNumber)) {
    return res.status(400).json({
      message: "Invalid phone number format",
    });
  }

  try {
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

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: normalizedOrganizationName,
          address: normalizedOrganizationAddress,
        },
      });

      return tx.user.create({
        data: {
          email: normalizedEmail,
          name: normalizedName,
          phoneNumber: normalizedPhoneNumber,
          passwordHash,
          organizationId: organization.id,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phoneNumber: true,
          createdAt: true,
          updatedAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
        },
      });
    });

    return res.status(201).json({
      message: "Register success",
      data: user,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
