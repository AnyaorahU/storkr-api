import prisma from "../../config/prisma.js";

const itemsInclude = {
  orderItems: {
    include: {
      product: { select: { id: true, name: true, slug: true, images: true } },
    },
  },
};

const createOrder = (data, db = prisma) =>
  db.order.create({ data, include: itemsInclude });

const findOrderById = (id, db = prisma) =>
  db.order.findUnique({ where: { id }, include: itemsInclude });

const findUserOrder = (id, userId, db = prisma) =>
  db.order.findFirst({ where: { id, userId }, include: itemsInclude });

const findUserOrders = async (userId, { skip, take }) => {
  const where = { userId };
  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: { orderItems: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.order.count({ where }),
  ]);
  return { orders, total };
};

const findAllOrders = async ({ status, skip, take }) => {
  const where = status ? { status } : {};
  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: {
        orderItems: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.order.count({ where }),
  ]);
  return { orders, total };
};

const updateOrderStatus = (id, status, db = prisma) =>
  db.order.update({ where: { id }, data: { status }, include: itemsInclude });

// compare-and-set: only updates if status is still `from`
// const transitionStatus = (id, from, to, db = prisma) =>
//   db.order.updateMany({ where: { id, status: from }, data: { status: to } });
const transitionStatus = (id, from, to, db = prisma, extraWhere = {}) =>
  db.order.updateMany({
    where: { id, status: from, ...extraWhere },
    data: { status: to },
  });

const setStripeSession = (id, stripeSessionId) =>
  prisma.order.update({ where: { id }, data: { stripeSessionId } });

// compare-and-set: only the current session, only once, only while pending
const markPaid = (id, stripeSessionId) =>
  prisma.order.updateMany({
    where: { id, stripeSessionId, status: "pending", paymentStatus: "unpaid" },
    data: { paymentStatus: "paid", paidAt: new Date() },
  });

export default {
  createOrder,
  findOrderById,
  findUserOrder,
  findUserOrders,
  findAllOrders,
  updateOrderStatus,
  transitionStatus,
  setStripeSession,
  markPaid,
};
