import { config } from "dotenv";

config({ path: ".env", override: false });

export const PORT = process.env.PORT;
export const DATABASE_URL = process.env.DATABASE_URL;
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES = process.env.JWT_EXPIRES;
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
export const CLIENT_URL = process.env.CLIENT_URL;
