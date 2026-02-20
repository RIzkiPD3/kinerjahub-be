import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Seeding data...");

    const organization = await prisma.organization.upsert({
        where: { id: "default-org-id" }, // Using a fixed string for seeding consistency if needed, or just specific name
        update: {},
        create: {
            id: "default-org-id",
            name: "Default Organization",
            address: "Default Address",
            phone: "08123456789",
        },
    });

    const division = await prisma.division.upsert({
        where: { id: "default-division-id" },
        update: {},
        create: {
            id: "default-division-id",
            name: "Default Division",
            organization_id: organization.id,
        },
    });

    const department = await prisma.department.upsert({
        where: { id: "default-dept-id" },
        update: {},
        create: {
            id: "default-dept-id",
            name: "Default Department",
            organization_id: organization.id,
            division_id: division.id,
        },
    });

    const role = await prisma.role.upsert({
        where: { id: "default-role-id" },
        update: {},
        create: {
            id: "default-role-id",
            name: "Admin",
            organization_id: organization.id,
        },
    });

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);

    const adminUser = await prisma.user.upsert({
        where: { email: "admin@kinerjahub.com" },
        update: {},
        create: {
            email: "admin@kinerjahub.com",
            name: "Admin KinerjaHub",
            password: hashedPassword,
            phone_number: "08123456789",
            organization_id: organization.id,
            division_id: division.id,
            department_id: department.id,
            role_id: role.id,
        },
    });


    console.log({ organization, division, department, role });
    console.log("\n✅ Admin account created:");
    console.log("   Email    : admin@kinerjahub.com");
    console.log("   Password : admin123");
    console.log("\nSeeding finished.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
