import { Request, Response } from "express";
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
  }
};

/**
 * GET USER BY ID
 */
export const getUserById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

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
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * CREATE USER (Admin Only)
 */
export const createUser = async (req: Request, res: Response) => {
  const { 
    name, 
    email, 
    password, 
    phone_number,
    organization_id, 
    department_id, 
    division_id,
    role_id 
  const {
    name,
    email,
    password,
    phone_number,
    organization_id,
    department_id,
    role_id,
  } = req.body;

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
        phone_number,
        password: hashedPassword,
        organization_id,
        department_id,
        division_id,
        role_id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role_id: true,
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
 * DELETE USER (Admin Only)
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
    return res.status(500).json({ message: "Internal server error" });
  }
};
