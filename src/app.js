import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import errorMiddleware from "./middleware/errorMiddleware.js";
import authRoute from "./modules/auth/auth.route.js";
import categoryRoute from "./modules/category/category.route.js";
import productRoute from "./modules/product/product.route.js";
import cartRoute from "./modules/cart/cart.route.js";
import orderRoute from "./modules/order/order.route.js";
import orderAdminRoute from "./modules/order/order.admin.route.js";
import {
  checkoutRoute,
  webhookRoute,
} from "./modules/payment/payment.route.js";
import { CLIENT_URL } from "./config/env.js";

const app = express();
// Enable this when deployed behind a trusted proxy.
// Configure the value according to your hosting environment.
// app.set("trust proxy", 1);

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(helmet());
app.use("/api/v1/webhooks", webhookRoute);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

app.get("/health", (req, res) => {
  return res
    .status(200)
    .json({ success: true, message: "Stockr API is running" });
});

app.use("/api/v1/auth", authRoute);
app.use("/api/v1/categories", categoryRoute);
app.use("/api/v1/products", productRoute);
app.use("/api/v1/carts", cartRoute);
app.use("/api/v1/orders", orderRoute);
app.use("/api/v1/admin/orders", orderAdminRoute);
app.use("/api/v1/orders", checkoutRoute);

app.use(errorMiddleware);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

export default app;
