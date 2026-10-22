import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import prisma from "../src/config/prisma.js";

import {
  createUser,
  createProduct,
  loginAs,
  placeOrder,
} from "./helpers/factories.js";

import { getStock, getOrder } from "./helpers/queries.js";
import { sendWebhook, sessionEvent } from "./helpers/stripe.js";

const WEBHOOK_PATH = "/api/v1/webhooks/stripe";

async function makeOrder({
  stock = 10,
  quantity = 2,
  sessionId = "cs_test_123",
} = {}) {
  const customer = await createUser();
  const product = await createProduct({ stock });
  const agent = await loginAs(customer);
  const order = await placeOrder(agent, product.id, quantity);

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: sessionId },
  });

  return { customer, product, order, sessionId };
}

async function sendSessionEvent(type, order, sessionId, options = {}) {
  return sendWebhook(
    sessionEvent(type, {
      orderId: order.id,
      sessionId,
      ...options,
    }),
  );
}

describe("Stripe webhook", () => {
  it("returns 400 when the signature header is missing", async () => {
    const response = await request(app)
      .post(WEBHOOK_PATH)
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "checkout.session.completed" }));

    expect(response.status).toBe(400);

    expect(response.body.message).toBe("Missing Stripe signature");
  });

  it("rejects a signature created with the wrong secret", async () => {
    const { order } = await makeOrder();

    const response = await sendWebhook(
      sessionEvent("checkout.session.completed", {
        orderId: order.id,
        sessionId: "cs_test_123",
      }),
      { secret: "whsec_wrong" },
    );

    expect(response.status).toBe(400);

    const updatedOrder = await getOrder(order.id);
    expect(updatedOrder.paymentStatus).toBe("unpaid");
    expect(updatedOrder.paidAt).toBeNull();
    expect(response.body.message).toBe("Invalid webhook signature");
  });

  it("marks an order paid when checkout.session.completed arrives", async () => {
    const { order, sessionId } = await makeOrder();

    const response = await sendSessionEvent(
      "checkout.session.completed",
      order,
      sessionId,
    );

    expect(response.status).toBe(200);

    const updatedOrder = await getOrder(order.id);
    expect(updatedOrder.paymentStatus).toBe("paid");
    expect(updatedOrder.paidAt).not.toBeNull();
  });

  it("handles duplicate completed events idempotently", async () => {
    const { order, sessionId } = await makeOrder();

    const firstResponse = await sendSessionEvent(
      "checkout.session.completed",
      order,
      sessionId,
    );

    expect(firstResponse.status).toBe(200);

    const firstOrder = await getOrder(order.id);
    expect(firstOrder.paymentStatus).toBe("paid");
    expect(firstOrder.paidAt).not.toBeNull();

    const firstPaidAt = firstOrder.paidAt;

    const secondResponse = await sendSessionEvent(
      "checkout.session.completed",
      order,
      sessionId,
    );

    expect(secondResponse.status).toBe(200);

    const secondOrder = await getOrder(order.id);
    expect(secondOrder.paymentStatus).toBe("paid");
    expect(secondOrder.paidAt).toEqual(firstPaidAt);
  });

  it("ignores a completed event for a stale session ID", async () => {
    const { order, sessionId } = await makeOrder();

    const response = await sendSessionEvent(
      "checkout.session.completed",
      order,
      `${sessionId}_stale`,
    );

    expect(response.status).toBe(200);

    const updatedOrder = await getOrder(order.id);
    expect(updatedOrder.paymentStatus).not.toBe("paid");
    expect(updatedOrder.paidAt).toBeNull();
  });

  it("cancels an order and restores stock when the current session expires", async () => {
    const { order, product, sessionId } = await makeOrder({
      stock: 10,
      quantity: 2,
    });

    expect(await getStock(product.id)).toBe(8);

    const response = await sendSessionEvent(
      "checkout.session.expired",
      order,
      sessionId,
    );

    expect(response.status).toBe(200);

    const updatedOrder = await getOrder(order.id);
    expect(updatedOrder.status).toBe("cancelled");
    expect(await getStock(product.id)).toBe(10);
  });

  it("ignores an expired event for a stale session ID", async () => {
    const { order, product, sessionId } = await makeOrder({
      stock: 10,
      quantity: 2,
    });

    const response = await sendSessionEvent(
      "checkout.session.expired",
      order,
      `${sessionId}_stale`,
    );

    expect(response.status).toBe(200);

    const updatedOrder = await getOrder(order.id);
    expect(updatedOrder.status).toBe("pending");
    expect(await getStock(product.id)).toBe(8);
  });

  it("acknowledges unknown event types without changing the order", async () => {
    const { order, product, sessionId } = await makeOrder();

    const response = await sendSessionEvent("charge.updated", order, sessionId);

    expect(response.status).toBe(200);

    const updatedOrder = await getOrder(order.id);
    expect(updatedOrder.paymentStatus).not.toBe("paid");
    expect(updatedOrder.paidAt).toBeNull();
    expect(await getStock(product.id)).toBe(8);
  });
});
