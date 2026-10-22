import { describe, it, expect } from "vitest";
import prisma from "../src/config/prisma.js";
import {
  createUser,
  createProduct,
  loginAs,
  placeOrder,
} from "./helpers/factories.js";

import { getStock, getOrderCount, getOrder } from "./helpers/queries.js";

const ORDERS_PATH = "/api/v1/orders";
const ADMIN_ORDERS_PATH = "/api/v1/admin/orders";

function customerCancelPath(orderId) {
  return `${ORDERS_PATH}/${orderId}/cancel`;
}

function adminStatusPath(orderId) {
  return `${ADMIN_ORDERS_PATH}/${orderId}/status`;
}

function updateStatus(agent, orderId, status) {
  return agent.patch(adminStatusPath(orderId)).send({ status });
}

async function makeAdmin() {
  const admin = await createUser({ role: "admin" });
  return loginAs(admin);
}

async function makeOrderedProduct({ stock = 10, quantity = 1 } = {}) {
  const customer = await createUser();
  const product = await createProduct({ stock });
  const agent = await loginAs(customer);
  const order = await placeOrder(agent, product.id, quantity);

  return { customer, product, agent, order };
}

describe("Order management API", () => {
  it("lists only the logged-in customer's orders", async () => {
    const customerA = await createUser();
    const customerB = await createUser();
    const product = await createProduct();

    const agentA = await loginAs(customerA);
    const agentB = await loginAs(customerB);

    await placeOrder(agentA, product.id);
    await placeOrder(agentB, product.id);

    const response = await agentA.get(ORDERS_PATH).expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.total).toBe(1);
    expect(response.body.data[0].userId).toBe(customerA.id);
  });

  it("returns 404 when a customer requests another customer's order", async () => {
    const { order, customer, agent: agentA } = await makeOrderedProduct();

    const customerB = await createUser();
    const agentB = await loginAs(customerB);

    expect(order.userId).toBe(customer.id);
    expect(order.userId).not.toBe(customerB.id);

    await agentB.get(`${ORDERS_PATH}/${order.id}`).expect(404);

    await agentA.get(`${ORDERS_PATH}/${order.id}`).expect(200);
  });

  it("allows a customer to cancel a pending, unpaid order and restores stock", async () => {
    const { order, agent, product } = await makeOrderedProduct({
      stock: 10,
      quantity: 2,
    });

    expect(await getStock(product.id)).toBe(8);

    const response = await agent
      .patch(customerCancelPath(order.id))
      .expect(200);

    expect(response.body.data.status).toBe("cancelled");
    expect(await getStock(product.id)).toBe(10);
  });

  it("rejects cancelling an already-cancelled order", async () => {
    const { order, agent, product } = await makeOrderedProduct({
      stock: 10,
      quantity: 2,
    });

    await agent.patch(customerCancelPath(order.id)).expect(200);

    expect(await getStock(product.id)).toBe(10);

    await agent.patch(customerCancelPath(order.id)).expect(400);

    expect(await getStock(product.id)).toBe(10);

    const res = await agent.patch(customerCancelPath(order.id)).expect(400);

    expect(res.body.message).toMatch(/only unpaid pending/i);
    expect(await getStock(product.id)).toBe(10);
  });

  it("rejects cancellation of a paid order without changing stock", async () => {
    const { order, agent, product } = await makeOrderedProduct({
      stock: 10,
      quantity: 2,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "paid" },
    });

    const res = await agent.patch(customerCancelPath(order.id)).expect(400);
    expect(res.body.message).toMatch(/only unpaid pending/i);

    expect(await getStock(product.id)).toBe(8);
    expect((await getOrder(order.id)).status).toBe("pending");
  });

  it("allows admin transitions from pending to processing to shipped to delivered", async () => {
    const { order } = await makeOrderedProduct();
    const adminAgent = await makeAdmin();

    for (const status of ["processing", "shipped", "delivered"]) {
      const response = await updateStatus(adminAgent, order.id, status).expect(
        200,
      );

      expect(response.body.data.status).toBe(status);
    }

    const updatedOrder = await getOrder(order.id);
    expect(updatedOrder.status).toBe("delivered");
  });

  it("rejects an invalid processing-to-delivered transition", async () => {
    const { order } = await makeOrderedProduct();
    const adminAgent = await makeAdmin();

    await updateStatus(adminAgent, order.id, "processing").expect(200);

    const response = await updateStatus(adminAgent, order.id, "delivered");

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/cannot change status/i);
  });

  it("allows an admin to cancel a processing order and restores stock", async () => {
    const { order, product } = await makeOrderedProduct({
      stock: 10,
      quantity: 2,
    });

    const adminAgent = await makeAdmin();

    expect(await getStock(product.id)).toBe(8);

    await updateStatus(adminAgent, order.id, "processing").expect(200);

    const response = await updateStatus(
      adminAgent,
      order.id,
      "cancelled",
    ).expect(200);

    expect(response.body.data.status).toBe("cancelled");
    expect(await getStock(product.id)).toBe(10);
  });

  it("forbids customers from accessing the admin order list", async () => {
    const customer = await createUser();
    const agent = await loginAs(customer);

    await agent.get(ADMIN_ORDERS_PATH).expect(403);
  });

  it("filters admin orders by status and omits the user's password", async () => {
    const adminAgent = await makeAdmin();

    const delivered = await makeOrderedProduct();
    const pending = await makeOrderedProduct();

    await updateStatus(adminAgent, delivered.order.id, "processing").expect(
      200,
    );

    await updateStatus(adminAgent, delivered.order.id, "shipped").expect(200);

    await updateStatus(adminAgent, delivered.order.id, "delivered").expect(200);

    const response = await adminAgent
      .get(`${ADMIN_ORDERS_PATH}?status=delivered`)
      .expect(200);

    expect(response.body.data.length).toBeGreaterThanOrEqual(1);

    expect(
      response.body.data.every((item) => item.status === "delivered"),
    ).toBe(true);

    expect(response.body.data[0].user).not.toHaveProperty("password");

    const pendingOrder = await getOrder(pending.order.id);
    expect(pendingOrder.status).toBe("pending");
  });

  it("restores stock exactly once when customer and admin cancel concurrently", async () => {
    const {
      order,
      agent: customerAgent,
      product,
    } = await makeOrderedProduct({
      stock: 10,
      quantity: 2,
    });

    const adminAgent = await makeAdmin();

    expect(await getStock(product.id)).toBe(8);

    const [a, b] = await Promise.all([
      customerAgent.patch(customerCancelPath(order.id)),
      adminAgent.patch(adminStatusPath(order.id)).send({ status: "cancelled" }),
    ]);

    expect(
      [a.status, b.status].filter((status) => status === 200),
    ).toHaveLength(1);

    expect(
      [a.status, b.status].every(
        (status) => status === 200 || status === 400 || status === 409,
      ),
    ).toBe(true);

    expect(await getStock(product.id)).toBe(10);
    expect(await getOrderCount()).toBe(1);

    const updatedOrder = await getOrder(order.id);
    expect(updatedOrder.status).toBe("cancelled");
  });
});
