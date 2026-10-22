import { stripe } from "../../config/stripe.js";
import { CLIENT_URL } from "../../config/env.js";
import AppError from "../../utils/appError.js";
import orderRepository from "../order/order.repository.js";
import orderService from "../order/order.service.js";

const CURRENCY = "usd";
const SESSION_TTL_SECONDS = 30 * 60; // stock is held by pending orders, so don't let sessions linger

const createCheckoutSession = async (userId, orderId) => {
  const order = await orderRepository.findUserOrder(orderId, userId);
  if (!order) throw new AppError("Order not found", 404);
  if (order.status !== "pending")
    throw new AppError("Only pending orders can be paid", 400);
  if (order.paymentStatus !== "unpaid")
    throw new AppError("Order has already been paid", 400);

  // reuse an open session instead of creating duplicates
  if (order.stripeSessionId) {
    const existing = await stripe.checkout.sessions.retrieve(
      order.stripeSessionId,
    );
    if (existing.status === "open") return { url: existing.url };
    if (existing.status === "complete") {
      throw new AppError("Payment is already being processed", 409);
    }
    // expired → fall through and create a new one
  }

  const amount = Number(order.total.mul(100).toFixed(0));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: CURRENCY,
          product_data: { name: `Stockr order ${order.orderNumber}` },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    metadata: { orderId: order.id },
    expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    success_url: `${CLIENT_URL}/orders/${order.id}?payment=success`,
    cancel_url: `${CLIENT_URL}/orders/${order.id}?payment=cancelled`,
  });

  await orderRepository.setStripeSession(order.id, session.id);
  return { url: session.url };
};

const handleCheckoutCompleted = async (session) => {
  const orderId = session.metadata?.orderId;
  if (!orderId || session.payment_status !== "paid") return;

  const { count } = await orderRepository.markPaid(orderId, session.id);
  if (count === 0) {
    // duplicate event (fine) or paid after cancellation (needs a manual refund)
    console.warn(
      `markPaid matched 0 rows for order ${orderId}, session ${session.id}`,
    );
  }
};

const handleCheckoutExpired = async (session) => {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  const order = await orderRepository.findOrderById(orderId);
  if (!order) return;

  // only act on the order's *current* session
  if (order.stripeSessionId !== session.id) return;
  if (order.status !== "pending" || order.paymentStatus !== "unpaid") return;

  await orderService.updateStatus(order.id, "cancelled");
};

const handleWebhookEvent = async (event) => {
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(event.data.object);
    case "checkout.session.expired":
      return handleCheckoutExpired(event.data.object);
    default:
      return; // ignored events still get a 200
  }
};

export default { createCheckoutSession, handleWebhookEvent };
