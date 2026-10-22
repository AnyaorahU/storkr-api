import { describe, it, expect } from "vitest";
import request from "supertest";
import { createUser, loginAs } from "./helpers/factories.js";
import app from "../src/app.js";

describe("Authentication API", () => {
  describe("POST /api/v1/auth/register", () => {
    it("registers a new user", async () => {
      const email = `register${Date.now()}@test.com`;

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Test User",
          email,
          password: "Password123!",
        })
        .expect(201);
      expect(response.body.data.role).toBe("customer");
      expect(response.body.data.email).toBe(email);
      expect(response.body.data).not.toHaveProperty("password");
    });

    it("returns 409 when registering the same email twice", async () => {
      const email = `duplicate${Date.now()}@test.com`;

      const payload = {
        name: "Test User",
        email,
        password: "Password123!",
      };

      await request(app)
        .post("/api/v1/auth/register")
        .send(payload)
        .expect(201);

      await request(app)
        .post("/api/v1/auth/register")
        .send(payload)
        .expect(409);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("logs in with correct credentials and sets an HttpOnly cookie", async () => {
      const user = await createUser();

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: user.email,
          password: user.plainPassword,
        })
        .expect(200);

      const cookies = response.headers["set-cookie"] ?? [];

      expect(cookies.join(";")).toMatch(/HttpOnly/i);
    });

    it("returns 401 for an incorrect password", async () => {
      const user = await createUser();

      await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: user.email,
          password: "WrongPassword123!",
        })
        .expect(401);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("returns the current user for an authenticated agent", async () => {
      const user = await createUser();
      const agent = await loginAs(user);

      const response = await agent.get("/api/v1/auth/me").expect(200);

      expect(response.body.data.email).toBe(user.email);
    });

    it("returns 401 without an authentication cookie", async () => {
      await request(app).get("/api/v1/auth/me").expect(401);
    });
  });

  describe("Login rate limiting", () => {
    it("allows 10 failed logins and rate-limits the 11th", async () => {
      const user = await createUser();

      for (let i = 0; i < 10; i++) {
        await request(app)
          .post("/api/v1/auth/login")
          .send({
            email: user.email,
            password: "WrongPassword123!",
          })
          .expect(401);
      }

      await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: user.email,
          password: "WrongPassword123!",
        })
        .expect(429);
    });
  });
});
