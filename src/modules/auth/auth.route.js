import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import authController from "./auth.controller.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import validation from "../../middleware/validation.js";
import authValidator from "./auth.validator.js";
import { loginLimiter, registerLimiter } from "../../middleware/rateLimiter.js";

const authRoute = Router();

authRoute.post(
  "/register",
  registerLimiter,
  validation(authValidator.registerSchema),
  asyncHandler(authController.register),
);

authRoute.post(
  "/login",
  loginLimiter,
  validation(authValidator.loginSchema),
  asyncHandler(authController.login),
);

authRoute.post("/logout", authMiddleware, asyncHandler(authController.logout));

authRoute.get("/me", authMiddleware, asyncHandler(authController.getMe));

export default authRoute;
