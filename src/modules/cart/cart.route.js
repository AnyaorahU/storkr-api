import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import validation from "../../middleware/validation.js";
import asyncHandler from "../../utils/asyncHandler.js";
import cartController from "./cart.controller.js";
import { addCartItemSchema, updateCartItemSchema } from "./cart.validation.js";

const cartRoute = Router();

cartRoute.use(authMiddleware); // every cart route requires login

cartRoute.get("/", asyncHandler(cartController.getCart));

cartRoute.post(
  "/items",
  validation(addCartItemSchema),
  asyncHandler(cartController.addItem),
);

cartRoute.patch(
  "/items/:productId",
  validation(updateCartItemSchema),
  asyncHandler(cartController.updateItem),
);

cartRoute.delete("/items/:productId", asyncHandler(cartController.removeItem));

cartRoute.delete("/", asyncHandler(cartController.clearCart));

export default cartRoute;
