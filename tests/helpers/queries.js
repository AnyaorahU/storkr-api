import prisma from "../../src/config/prisma.js";

export async function getStock(productId) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
  });

  return product.stock;
}

export async function getOrderCount(userIds) {
  return prisma.order.count({
    where: userIds
      ? { userId: { in: Array.isArray(userIds) ? userIds : [userIds] } }
      : undefined,
  });
}

export async function getCartItemCount(userId) {
  return prisma.cartItem.count({
    where: {
      cart: { userId },
    },
  });
}

export async function getOrder(orderId) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: { orderItems: true },
  });
}
