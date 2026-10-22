import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import categoryController from "./category.controller.js";
import authorize from "../../middleware/authorize.js";
import asyncHandler from "../../utils/asyncHandler.js";

const categoryRoute = Router();

categoryRoute.get("/", asyncHandler(categoryController.findAllCategories));

categoryRoute.get("/:id", asyncHandler(categoryController.findCategoryById));

categoryRoute.post(
  "/",
  authMiddleware,
  authorize("admin"),
  asyncHandler(categoryController.createCategory),
);

categoryRoute.patch(
  "/:id",
  authMiddleware,
  authorize("admin"),
  asyncHandler(categoryController.updateCategory),
);

categoryRoute.delete(
  "/:id",
  authMiddleware,
  authorize("admin"),
  asyncHandler(categoryController.deleteCategory),
);

export default categoryRoute;
