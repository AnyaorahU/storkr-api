import orderService from "./order.service.js";

const checkout = async (req, res) => {
  const order = await orderService.checkout(req.user.id, req.body);
  res.status(201).json({ success: true, message: "Order placed", data: order });
};

const getMyOrders = async (req, res) => {
  const { data, meta } = await orderService.getMyOrders(
    req.user.id,
    req.validatedQuery,
  );
  res.status(200).json({ success: true, data, meta });
};

const getMyOrder = async (req, res) => {
  const order = await orderService.getMyOrder(req.user.id, req.params.id);
  res.status(200).json({ success: true, data: order });
};

const cancelMyOrder = async (req, res) => {
  const order = await orderService.cancelMyOrder(req.user.id, req.params.id);
  res
    .status(200)
    .json({ success: true, message: "Order cancelled", data: order });
};

const getAllOrders = async (req, res) => {
  const { data, meta } = await orderService.getAllOrders(req.validatedQuery);
  res.status(200).json({ success: true, data, meta });
};

const updateStatus = async (req, res) => {
  const order = await orderService.updateStatus(req.params.id, req.body.status);
  res
    .status(200)
    .json({ success: true, message: "Order status updated", data: order });
};

export default {
  checkout,
  getMyOrders,
  getMyOrder,
  cancelMyOrder,
  getAllOrders,
  updateStatus,
};
