import prisma from "../lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

export const registerUser = async (
    name: string,
    email: string,
    password: string,
    phone_number: string,
    organization_id: number,
    department_id: number,
    role_id: number,
    division_id: number
) => {
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new Error("Email already registered");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            phone_number,
            organization_id,
            department_id,
            role_id,
            division_id,
        },
    });

    return user;
};

export const loginUser = async (email: string, password: string) => {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        throw new Error("User not found");
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
        throw new Error("Invalid password");
    }

    const token = jwt.sign(
        { id: user.id, role: user.role_id },
        JWT_SECRET,
        { expiresIn: "1d" }
    );

    return {
        token,
        user,
    };
};
