import cartService from "./cart.service.js";

const getCart = async (req, res) => {
  const cart = await cartService.getCart(req.user.id);
  res.status(200).json({ success: true, data: cart });
};

const addItem = async (req, res) => {
  const { productId, quantity } = req.body;
  const cart = await cartService.addItem(req.user.id, productId, quantity);
  res
    .status(200)
    .json({ success: true, message: "Item added to cart", data: cart });
};

const updateItem = async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;
  const cart = await cartService.updateItem(req.user.id, productId, quantity);
  res.status(200).json({ success: true, message: "Item updated", data: cart });
};

const removeItem = async (req, res) => {
  const { productId } = req.params;
  const cart = await cartService.removeItem(req.user.id, productId);
  res.status(200).json({ success: true, message: "Item removed", data: cart });
};

const clearCart = async (req, res) => {
  const cart = await cartService.clearCart(req.user.id);
  res.status(200).json({ success: true, message: "Cart cleared", data: cart });
};

export default { getCart, addItem, updateItem, removeItem, clearCart };
