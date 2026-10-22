import express, { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import asyncHandler from "../../utils/asyncHandler.js";
import paymentController from "./payment.controller.js";

// customer: mounted at /api/v1/orders
export const checkoutRoute = Router();

checkoutRoute.post(
  "/:id/pay",
  authMiddleware,
  asyncHandler(paymentController.createCheckoutSession),
);

// Stripe: mounted at /api/v1/webhooks (no auth, raw body)
export const webhookRoute = Router();

webhookRoute.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  asyncHandler(paymentController.stripeWebhook),
);
