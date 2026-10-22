import { z } from "zod";

export const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const requiredText = (label, max) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} is too long`);

export const createOrderSchema = z.object({
  shippingAddress: requiredText("Shipping address", 255),
  shippingCity: requiredText("City", 100),
  shippingState: requiredText("State", 100),
  shippingZip: requiredText("Zip code", 20),
  shippingCountry: requiredText("Country", 100),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{7,20}$/, "Phone number is invalid"),
});

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
};

export const myOrdersQuerySchema = z.object(pagination);

export const adminOrdersQuerySchema = z.object({
  ...pagination,
  status: z.enum(ORDER_STATUSES).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});
