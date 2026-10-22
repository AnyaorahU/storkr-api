import prisma from "../../config/prisma.js";

const findCartByUserId = (userId) =>
  prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              images: true,
              stock: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

const upsertCart = (userId) =>
  prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

const findCartItem = (cartId, productId) =>
  prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId, productId } },
  });

// sets the final quantity; the service computes it after the stock check
const upsertCartItem = (cartId, productId, quantity) =>
  prisma.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    update: { quantity },
    create: { cartId, productId, quantity },
  });

const updateCartItem = (cartId, productId, quantity) =>
  prisma.cartItem.update({
    where: { cartId_productId: { cartId, productId } },
    data: { quantity },
  });

const deleteCartItem = (cartId, productId) =>
  prisma.cartItem.delete({
    where: { cartId_productId: { cartId, productId } },
  });

const clearCart = (cartId, db = prisma) =>
  db.cartItem.deleteMany({ where: { cartId } });

export default {
  findCartByUserId,
  upsertCart,
  findCartItem,
  upsertCartItem,
  updateCartItem,
  deleteCartItem,
  clearCart,
};
