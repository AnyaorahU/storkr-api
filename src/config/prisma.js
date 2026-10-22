import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../../generated/prisma/client.ts";
import { DATABASE_URL } from "./env.js";

const adapter = new PrismaPg({
  connectionString:
    DATABASE_URL ||
    "postgresql://ghoststack@localhost:5432/stockr_db?host=/var/run/postgresql",
});

const prisma = new PrismaClient({ adapter });

// All Decimal columns are money (Decimal(10,2)), so serialise them as "12000.00" everywhere.
// If a non-money Decimal is ever added, replace this with per-field formatting.
Prisma.Decimal.prototype.toJSON = function () {
  return this.toFixed(2);
};

export { Prisma };
export default prisma;
