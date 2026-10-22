import { describe, it, expect } from "vitest";
import {
  createUser,
  createProduct,
  loginAs,
  addToCart,
  shipping,
} from "./helpers/factories.js";
import prisma from "../src/config/prisma.js";

const CHECKOUT_PATH = "/api/v1/orders";

async function getStock(productId) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
  });

  return product.stock;
}

async function getOrderCount(userIds) {
  return prisma.order.count({
    where: userIds ? { userId: { in: userIds } } : undefined,
  });
}

async function getCartItemCount(userId) {
  return prisma.cartItem.count({
    where: {
      cart: { userId },
    },
  });
}

describe("POST /api/v1/orders", () => {
  it("successfully checks out and empties the cart", async () => {
    const user = await createUser();
    const product = await createProduct({
      stock: 10,
      price: 50,
    });

    const quantity = 2;

    const agent = await loginAs(user);
    await addToCart(agent, product.id, quantity);

    const response = await agent.post(CHECKOUT_PATH).send(shipping).expect(201);

    const order = await prisma.order.findFirst({
      where: { userId: user.id },
      include: { orderItems: true },
    });

    expect(order).not.toBeNull();
    expect(order.status).toBe("pending");
    expect(Number(order.total)).toBe(100);
    expect(order.orderItems).toHaveLength(1);
    expect(Number(order.orderItems[0].price)).toBe(50);
    expect(order.orderItems[0].quantity).toBe(quantity);

    expect(await getStock(product.id)).toBe(8);
    expect(await getCartItemCount(user.id)).toBe(0);
    expect(response.body.success).toBe(true);
  });

  it("returns 400 when the cart is empty", async () => {
    const user = await createUser();
    const agent = await loginAs(user);

    const res = await agent.post(CHECKOUT_PATH).send(shipping).expect(400);
    expect(res.body.message).toBe("Cart is empty");

    expect(await getOrderCount([user.id])).toBe(0);
  });

  it("rejects checkout if a cart product was deactivated", async () => {
    const user = await createUser();
    const product = await createProduct({ stock: 5 });

    const agent = await loginAs(user);
    await addToCart(agent, product.id, 1);

    await prisma.product.update({
      where: { id: product.id },
      data: { isActive: false },
    });

    await agent.post(CHECKOUT_PATH).send(shipping).expect(400);

    const res = await agent.post(CHECKOUT_PATH).send(shipping).expect(400);
    expect(res.body.message).toMatch(/unavailable/i);

    expect(await getOrderCount([user.id])).toBe(0);
    expect(await getStock(product.id)).toBe(5);
    expect(await getCartItemCount(user.id)).toBe(1);
  });

  it("rolls back checkout when stock becomes insufficient", async () => {
    const user = await createUser();
    const product = await createProduct({ stock: 10 });

    const agent = await loginAs(user);
    await addToCart(agent, product.id, 2);

    // Simulate inventory being depleted after the item entered the cart.
    await prisma.product.update({
      where: { id: product.id },
      data: { stock: 1 },
    });

    await agent.post(CHECKOUT_PATH).send(shipping).expect(400);

    const res = await agent.post(CHECKOUT_PATH).send(shipping).expect(400);
    expect(res.body.message).toMatch(/not enough stock/i);

    expect(await getStock(product.id)).toBe(1);
    expect(await getCartItemCount(user.id)).toBe(1);
    expect(await getOrderCount([user.id])).toBe(0);
  });

  it("allows only one of two buyers to purchase the last unit", async () => {
    const buyerA = await createUser();
    const buyerB = await createUser();
    const product = await createProduct({ stock: 1 });

    const agentA = await loginAs(buyerA);
    const agentB = await loginAs(buyerB);
    await addToCart(agentA, product.id, 1);
    await addToCart(agentB, product.id, 1);

    const [a, b] = await Promise.all([
      agentA.post(CHECKOUT_PATH).send(shipping),
      agentB.post(CHECKOUT_PATH).send(shipping),
    ]);

    const statuses = [a.status, b.status].sort((x, y) => x - y);
    expect(statuses).toEqual([201, 400]);

    const loser = [a, b].find((r) => r.status !== 201);
    expect(loser.body.message).toMatch(/not enough stock/i);

    expect(await getStock(product.id)).toBe(0);
    expect(await getOrderCount([buyerA.id, buyerB.id])).toBe(1);
  });

  it("creates only one order when the same customer checks out twice concurrently", async () => {
    const user = await createUser();
    const product = await createProduct({ stock: 10 });

    const agent = await loginAs(user);
    await addToCart(agent, product.id, 1);

    const [a, b] = await Promise.all([
      agent.post(CHECKOUT_PATH).send(shipping),
      agent.post(CHECKOUT_PATH).send(shipping),
    ]);

    const statuses = [a.status, b.status];
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);

    const loser = [a, b].find((r) => r.status !== 201);
    expect(loser.body.message).toMatch(/cart changed|cart is empty/i);

    expect(await getOrderCount([user.id])).toBe(1);
    expect(await getStock(product.id)).toBe(9);
  });
});
