import productService from "./product.service.js";

const findAllProducts = async (req, res) => {
  const query = req.validatedQuery;

  const { data, meta } = await productService.findAllProducts(query);

  res.status(200).json({
    success: true,
    data,
    meta,
  });
};

const findProductBySlug = async (req, res) => {
  const slug = req.params.slug;

  const product = await productService.findProductBySlug(slug);

  res.status(200).json({ success: true, data: product });
};

const createProduct = async (req, res) => {
  const data = req.body;

  const product = await productService.createProduct(data);

  res.status(201).json({
    success: true,
    message: "Product created",
    data: product,
  });
};

const updateProduct = async (req, res) => {
  const id = req.params.id;
  const data = req.body;

  const product = await productService.updateProduct(id, data);

  res.status(200).json({
    success: true,
    message: "Product updated",
    data: product,
  });
};

const restockProduct = async (req, res) => {
  const id = req.params.id;
  const { quantity } = req.body;

  const product = await productService.restockProduct(id, quantity);

  res.status(200).json({
    success: true,
    message: "Stock updated",
    data: product,
  });
};

const softDeleteProduct = async (req, res) => {
  const id = req.params.id;

  await productService.softDeleteProduct(id);

  res.status(200).json({
    success: true,
    message: "Product deleted",
  });
};

export default {
  findAllProducts,
  findProductBySlug,
  createProduct,
  updateProduct,
  restockProduct,
  softDeleteProduct,
};
