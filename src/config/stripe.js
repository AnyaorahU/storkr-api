import Stripe from "stripe";
import { STRIPE_SECRET_KEY } from "./env.js";

if (!STRIPE_SECRET_KEY) {
  throw new AppError("STRIPE_SECRET_KEY", 500);
}

export const stripe = new Stripe(STRIPE_SECRET_KEY);
