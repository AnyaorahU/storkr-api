import { z } from "zod";

const price = z
  .number()
  .positive("Price must be greater than 0")
  .max(99999999.99, "Price is too large")
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-8, {
    message: "Price can have at most 2 decimal places",
  });

// shared fields: no defaults here
const productFields = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(5000).optional(),
  price,
  images: z.array(z.string().url("Each image must be a valid URL")),
  categoryId: z.string().min(1, "categoryId is required"),
});

// create: add defaults + stock
export const createProductSchema = productFields.extend({
  stock: z.number().int().nonnegative().default(0),
  images: productFields.shape.images.default([]),
});

// update: partial, no defaults, no stock
export const updateProductSchema = productFields
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export const restockProductSchema = z.object({
  quantity: z.number().int().positive("Quantity must be a positive integer"),
});

export const productQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    category: z.string().trim().optional(),
    search: z.string().trim().optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
  })
  .refine(
    (q) =>
      q.minPrice === undefined ||
      q.maxPrice === undefined ||
      q.minPrice <= q.maxPrice,
    { message: "minPrice cannot be greater than maxPrice" },
  );
