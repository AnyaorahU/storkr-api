import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import validation from "../../middleware/validation.js";
import { createOrderSchema, myOrdersQuerySchema } from "./order.validation.js";
import asyncHandler from "../../utils/asyncHandler.js";
import orderController from "./order.controller.js";

const orderRoute = Router();

orderRoute.use(authMiddleware);

orderRoute.get(
  "/",
  validation(myOrdersQuerySchema, "query"),
  asyncHandler(orderController.getMyOrders),
);

orderRoute.get("/:id", asyncHandler(orderController.getMyOrder));

orderRoute.post(
  "/",
  validation(createOrderSchema),
  asyncHandler(orderController.checkout),
);

orderRoute.patch("/:id/cancel", asyncHandler(orderController.cancelMyOrder));

export default orderRoute;
