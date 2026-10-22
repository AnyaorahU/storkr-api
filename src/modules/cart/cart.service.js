import prisma, { Prisma } from "../../config/prisma.js";
import AppError from "../../utils/appError.js";
import productRepository from "../product/product.repository.js";
import cartRepository from "./cart.repository.js";

const MAX_QTY = 99;

//get cart
const emptyCart = () => ({ items: [], totalItems: 0, total: "0.00" });

const getCart = async (userId) => {
  const cart = await cartRepository.findCartByUserId(userId);
  if (!cart) return emptyCart();

  let total = new Prisma.Decimal(0);
  let totalItems = 0;

  const items = cart.items.map((item) => {
    const { product } = item;
    const available = product.isActive && product.stock >= item.quantity;
    const subtotal = product.price.mul(item.quantity);

    if (available) {
      total = total.add(subtotal);
      totalItems += item.quantity;
    }

    return {
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price.toFixed(2),
      image: product.images[0] ?? null,
      quantity: item.quantity,
      subtotal: subtotal.toFixed(2),
      available,
    };
  });

  return { items, totalItems, total: total.toFixed(2) };
};

//add item
const getActiveProduct = async (productId) => {
  const product = await productRepository.findProductById(productId);
  if (!product || !product.isActive)
    throw new AppError("Product not found", 404);
  return product;
};

const ensureInStock = (product, quantity) => {
  if (quantity > product.stock) {
    throw new AppError(`Only ${product.stock} left in stock`, 400);
  }
};

const addItem = async (userId, productId, quantity) => {
  const product = await getActiveProduct(productId);

  const cart = await cartRepository.upsertCart(userId);
  const existing = await cartRepository.findCartItem(cart.id, productId);
  const newQty = (existing?.quantity ?? 0) + quantity;

  if (newQty > MAX_QTY)
    throw new AppError(`Quantity cannot exceed ${MAX_QTY}`, 400);
  ensureInStock(product, newQty);

  await cartRepository.upsertCartItem(cart.id, productId, newQty);
  return getCart(userId);
};

//update
const getCartItemOrFail = async (userId, productId) => {
  const cart = await cartRepository.findCartByUserId(userId);
  const item = cart && (await cartRepository.findCartItem(cart.id, productId));
  if (!item) throw new AppError("Item not in cart", 404);
  return cart;
};

const updateItem = async (userId, productId, quantity) => {
  const cart = await getCartItemOrFail(userId, productId);
  const product = await getActiveProduct(productId);
  ensureInStock(product, quantity);

  await cartRepository.updateCartItem(cart.id, productId, quantity);
  return getCart(userId);
};

const removeItem = async (userId, productId) => {
  const cart = await getCartItemOrFail(userId, productId);
  await cartRepository.deleteCartItem(cart.id, productId);
  return getCart(userId);
};

const clearCart = async (userId) => {
  const cart = await cartRepository.findCartByUserId(userId);
  if (cart) await cartRepository.clearCart(cart.id);
  return emptyCart();
};

export default { getCart, addItem, updateItem, removeItem, clearCart };
