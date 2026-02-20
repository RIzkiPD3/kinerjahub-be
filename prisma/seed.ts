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
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            name: "Default Organization",
            address: "Default Address",
            phone: "08123456789",
        },
    });

    const division = await prisma.division.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            name: "Default Division",
            organization_id: organization.id,
        },
    });

    const department = await prisma.department.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            name: "Default Department",
            organization_id: organization.id,
            division_id: division.id,
        },
    });

    const role = await prisma.role.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
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

    // Sync sequences for PostgreSQL to avoid P2002 after manual ID inserts
    console.log("Syncing sequences...");
    const tables = ["organizations", "divisions", "departments", "roles", "users"];
    for (const table of tables) {
        await prisma.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), coalesce(max(id),0) + 1, false) FROM "${table}";`
        );
    }

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
