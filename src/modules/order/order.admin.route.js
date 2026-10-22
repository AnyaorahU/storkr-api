import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import authorize from "../../middleware/authorize.js";
import validation from "../../middleware/validation.js";
import asyncHandler from "../../utils/asyncHandler.js";
import orderController from "./order.controller.js";
import {
  adminOrdersQuerySchema,
  updateOrderStatusSchema,
} from "./order.validation.js";

const orderAdminRoute = Router();

orderAdminRoute.use(authMiddleware, authorize("admin"));

orderAdminRoute.get(
  "/",
  validation(adminOrdersQuerySchema, "query"),
  asyncHandler(orderController.getAllOrders),
);

orderAdminRoute.patch(
  "/:id/status",
  validation(updateOrderStatusSchema),
  asyncHandler(orderController.updateStatus),
);

export default orderAdminRoute;
