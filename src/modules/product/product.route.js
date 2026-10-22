import { Router } from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import productController from "./product.controller.js";
import asyncHandler from "../../utils/asyncHandler.js";
import authorize from "../../middleware/authorize.js";
import validation from "../../middleware/validation.js";
import {
  createProductSchema,
  productQuerySchema,
  restockProductSchema,
  updateProductSchema,
} from "./product.validation.js";

const productRoute = Router();

productRoute.get(
  "/",
  validation(productQuerySchema, "query"),
  asyncHandler(productController.findAllProducts),
);

productRoute.get("/:slug", asyncHandler(productController.findProductBySlug));

productRoute.post(
  "/",
  authMiddleware,
  authorize("admin"),
  validation(createProductSchema),
  asyncHandler(productController.createProduct),
);

productRoute.patch(
  "/:id",
  authMiddleware,
  authorize("admin"),
  validation(updateProductSchema),
  asyncHandler(productController.updateProduct),
);

productRoute.patch(
  "/:id/stock",
  authMiddleware,
  authorize("admin"),
  validation(restockProductSchema),
  asyncHandler(productController.restockProduct),
);

productRoute.delete(
  "/:id",
  authMiddleware,
  authorize("admin"),
  asyncHandler(productController.softDeleteProduct),
);

export default productRoute;
