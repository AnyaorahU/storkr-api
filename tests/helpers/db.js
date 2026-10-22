import prisma from "../../src/config/prisma.js";

export async function resetDb() {
  if (!process.env.DATABASE_URL?.includes("stockr_test")) {
    throw new Error(
      "Safety check failed: DATABASE_URL must include 'stockr_test' before resetting the database.",
    );
  }

  await prisma.$executeRawUnsafe(`
    TRUNCATE
      "OrderItem",
      "Order",
      "CartItem",
      "Cart",
      "Product",
      "Category",
      "User"
    RESTART IDENTITY CASCADE;
  `);
}
