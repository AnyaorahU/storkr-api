import request from "supertest";
import app from "../../src/app.js";
import { stripe } from "../../src/config/stripe.js";

export async function sendWebhook(
  event,
  { secret = process.env.STRIPE_WEBHOOK_SECRET } = {},
) {
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET must be configured for tests");
  }

  const payload = JSON.stringify(event);

  const header = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });

  return request(app)
    .post("/api/v1/webhooks/stripe")
    .set("Content-Type", "application/json")
    .set("stripe-signature", header)
    .send(payload);
}

export function sessionEvent(
  type,
  { orderId, sessionId, paymentStatus = "paid" },
) {
  return {
    id: `evt_test_${Date.now()}_${Math.random()}`,
    type,
    data: {
      object: {
        id: sessionId,
        payment_status: paymentStatus,
        metadata: { orderId },
      },
    },
  };
}
