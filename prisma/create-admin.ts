// Quick helper to create/reset an admin user. Run with:
//   node --experimental-strip-types --no-warnings prisma/create-admin.ts
// Edit EMAIL / PASSWORD below before running.

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const EMAIL = "admin@admin.com";
const PASSWORD = "admin123";
const NAME = "Admin";

const prisma = new PrismaClient();

const hashedPassword = await bcrypt.hash(PASSWORD, 10);

const user = await prisma.user.upsert({
  where: { email: EMAIL },
  update: { hashedPassword, role: "ADMIN" },
  create: { email: EMAIL, name: NAME, hashedPassword, role: "ADMIN" },
});

console.log(`OK — ${user.email} (role: ${user.role})`);
await prisma.$disconnect();
