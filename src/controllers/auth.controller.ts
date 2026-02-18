import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { Prisma } from "../generated/prisma/client";
import prisma from "../lib/prisma";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10;

export const register = async (req: Request, res: Response) => {
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

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({
      message: "Invalid email format",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      message: "Password must be at least 8 characters",
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

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
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
