import { STRIPE_WEBHOOK_SECRET } from "../../config/env.js";
import { stripe } from "../../config/stripe.js";
import paymentService from "./payment.service.js";

const createCheckoutSession = async (req, res) => {
  const checkout = await paymentService.createCheckoutSession(
    req.user.id,
    req.params.id,
  );
  res.status(200).json({ success: true, data: checkout });
};

const stripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];
  if (!signature) {
    return res
      .status(400)
      .json({ success: false, message: "Missing Stripe signature" });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.error("Stripe signature verification failed:", error.message);
    return res
      .status(400)
      .json({ success: false, message: "Invalid webhook signature" });
  }

  try {
    await paymentService.handleWebhookEvent(event);
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error(
      `Webhook processing failed for ${event.type} (${event.id}):`,
      error,
    );
    return res
      .status(500)
      .json({ success: false, message: "Webhook processing failed" });
  }
};

export default { createCheckoutSession, stripeWebhook };
