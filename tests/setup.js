import { beforeEach, afterAll } from "vitest";
import prisma from "../src/config/prisma.js";
import { resetDb } from "./helpers/db.js";
import {
  loginLimiter,
  registerLimiter,
} from "../src/middleware/rateLimiter.js";

const TEST_IPS = ["::ffff:127.0.0.1", "127.0.0.1", "::1"];

beforeEach(async () => {
  await resetDb();
  for (const ip of TEST_IPS) {
    loginLimiter.resetKey(ip);
    registerLimiter.resetKey(ip);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
