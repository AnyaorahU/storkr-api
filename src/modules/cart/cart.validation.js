import { z } from "zod";

const quantity = z
  .number()
  .int("Quantity must be a whole number")
  .min(1, "Quantity must be at least 1")
  .max(99, "Quantity cannot exceed 99");

export const addCartItemSchema = z.object({
  productId: z.string().trim().min(1, "Product ID is required"),
  quantity,
});

export const updateCartItemSchema = z.object({
  quantity,
});

export const cartItemParamsSchema = z.object({
  productId: z.string().trim().min(1, "Product ID is required"),
});
