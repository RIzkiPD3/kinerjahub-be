import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
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

    console.log({ organization, division, department, role });
    console.log("Seeding finished.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
