import prisma, { Prisma } from "../../config/prisma.js";
import AppError from "../../utils/appError.js";
import cartRepository from "../cart/cart.repository.js";
import productRepository from "../product/product.repository.js";
import orderRepository from "./order.repository.js";

const TRANSITIONS = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

const restoreStock = async (order, tx) => {
  for (const item of order.orderItems) {
    await productRepository.incrementStock(item.productId, item.quantity, tx);
  }
};

// shared by customer cancel and admin status updates
//=====================================================
// const changeStatus = (order, to) =>
//   prisma.$transaction(async (tx) => {
//     const { count } = await orderRepository.transitionStatus(
//       order.id,
//       order.status,
//       to,
//       tx,
//     );
//     if (count === 0) {
//       throw new AppError(
//         "Order was updated by another request, please refresh",
//         409,
//       );
//     }
//     if (to === "cancelled") await restoreStock(order, tx);
//     return orderRepository.findOrderById(order.id, tx);
//   });
//===== correction ====
const changeStatus = (order, to, extraWhere = {}) =>
  prisma.$transaction(async (tx) => {
    const { count } = await orderRepository.transitionStatus(
      order.id,
      order.status,
      to,
      tx,
      extraWhere,
    );
    if (count === 0) {
      throw new AppError(
        "Order was updated by another request, please refresh",
        409,
      );
    }
    if (to === "cancelled") await restoreStock(order, tx);
    return orderRepository.findOrderById(order.id, tx);
  });

const checkout = async (userId, shipping) => {
  const cart = await cartRepository.findCartByUserId(userId);
  if (!cart || cart.items.length === 0)
    throw new AppError("Cart is empty", 400);

  const unavailable = cart.items.filter((item) => !item.product.isActive);
  if (unavailable.length > 0) {
    const names = unavailable.map((item) => item.product.name).join(", ");
    throw new AppError(
      `Remove unavailable items from your cart: ${names}`,
      400,
    );
  }

  return prisma.$transaction(async (tx) => {
    // claim the cart first: a concurrent checkout will delete 0 rows here
    const cleared = await cartRepository.clearCart(cart.id, tx);
    if (cleared.count !== cart.items.length) {
      throw new AppError(
        "Your cart changed during checkout, please try again",
        409,
      );
    }

    let total = new Prisma.Decimal(0);
    const orderItems = [];

    for (const { product, quantity } of cart.items) {
      const { count } = await productRepository.decrementStock(
        product.id,
        quantity,
        tx,
      );
      if (count === 0)
        throw new AppError(`Not enough stock for ${product.name}`, 400);

      const { price } = await tx.product.findUnique({
        where: { id: product.id },
        select: { price: true },
      });

      total = total.add(price.mul(quantity));
      orderItems.push({ productId: product.id, quantity, price });
    }

    return orderRepository.createOrder(
      { userId, ...shipping, total, orderItems: { create: orderItems } },
      tx,
    );
  });
};

const getMyOrders = async (userId, { page, limit }) => {
  const { orders, total } = await orderRepository.findUserOrders(userId, {
    skip: (page - 1) * limit,
    take: limit,
  });
  return { data: orders, meta: buildMeta(page, limit, total) };
};

const getMyOrder = async (userId, id) => {
  const order = await orderRepository.findUserOrder(id, userId);
  if (!order) throw new AppError("Order not found", 404);
  return order;
};

// const cancelMyOrder = async (userId, id) => {
//   const order = await getMyOrder(userId, id);
//   if (order.status !== "pending") {
//     throw new AppError("Only pending orders can be cancelled", 400);
//   }
//   return changeStatus(order, "cancelled");
// };
//==== correction =====
const cancelMyOrder = async (userId, id) => {
  const order = await getMyOrder(userId, id);
  if (order.status !== "pending" || order.paymentStatus !== "unpaid") {
    throw new AppError("Only unpaid pending orders can be cancelled", 400);
  }
  return changeStatus(order, "cancelled", { paymentStatus: "unpaid" });
};

const getAllOrders = async ({ status, page, limit }) => {
  const { orders, total } = await orderRepository.findAllOrders({
    status,
    skip: (page - 1) * limit,
    take: limit,
  });
  return { data: orders, meta: buildMeta(page, limit, total) };
};

const updateStatus = async (id, newStatus) => {
  const order = await orderRepository.findOrderById(id);
  if (!order) throw new AppError("Order not found", 404);

  if (!TRANSITIONS[order.status].includes(newStatus)) {
    throw new AppError(
      `Cannot change status from ${order.status} to ${newStatus}`,
      400,
    );
  }
  return changeStatus(order, newStatus);
};

export default {
  checkout,
  getMyOrders,
  getMyOrder,
  cancelMyOrder,
  getAllOrders,
  updateStatus,
};
