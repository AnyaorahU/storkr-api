import productRepository from "./product.repository.js";
import categoryRepository from "../category/category.repository.js";
import AppError from "../../utils/appError.js";
import slugify from "../../utils/slugify.js";

const generateUniqueSlug = async (name) => {
  const base = slugify(name);
  let slug = base;
  let counter = 2;

  while (await productRepository.slugExists(slug)) {
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
};

const ensureCategoryExists = async (categoryId) => {
  const category = await categoryRepository.findCategoryById(categoryId);
  if (!category) throw new AppError("Category not found", 404);
};

const findAllProducts = async ({
  search,
  category,
  minPrice,
  maxPrice,
  page = 1,
  limit = 10,
}) => {
  const where = { isActive: true };

  if (search) where.name = { contains: search, mode: "insensitive" };
  if (category) where.category = { slug: category };

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }

  const skip = (page - 1) * limit;
  const { products, total } = await productRepository.findAllProducts({
    where,
    skip,
    take: limit,
  });

  return {
    data: products,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const findProductBySlug = async (slug) => {
  const product = await productRepository.findActiveProductBySlug(slug);
  if (!product) throw new AppError("Product not found", 404);
  return product;
};

const createProduct = async (data) => {
  await ensureCategoryExists(data.categoryId);
  const slug = await generateUniqueSlug(data.name);
  return productRepository.createProduct({ ...data, slug });
};

const updateProduct = async (id, data) => {
  const existing = await productRepository.findProductById(id);
  if (!existing) throw new AppError("Product not found", 404);

  const updateData = { ...data };

  if (data.name && data.name !== existing.name) {
    const base = slugify(data.name);
    // "Blue Mug" -> "blue mug" gives the same slug; don't treat its own slug as taken
    updateData.slug =
      base === existing.slug
        ? existing.slug
        : await generateUniqueSlug(data.name);
  }

  if (data.categoryId && data.categoryId !== existing.categoryId) {
    await ensureCategoryExists(data.categoryId);
  }

  return productRepository.updateProduct(id, updateData);
};

const restockProduct = async (id, quantity) => {
  const existing = await productRepository.findProductById(id);
  if (!existing) throw new AppError("Product not found", 404);
  return productRepository.restockProduct(id, quantity);
};

const softDeleteProduct = async (id) => {
  const existing = await productRepository.findProductById(id);
  if (!existing) throw new AppError("Product not found", 404);
  return productRepository.softDeleteProduct(id);
};

export default {
  findAllProducts,
  findProductBySlug,
  createProduct,
  updateProduct,
  restockProduct,
  softDeleteProduct,
};
