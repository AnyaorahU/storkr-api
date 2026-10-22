import prisma from "../../config/prisma.js";

const categorySelect = { select: { id: true, name: true, slug: true } };

const countProductsByCategory = (categoryId) =>
  prisma.product.count({ where: { categoryId } });

const findAllProducts = async ({ where, skip, take }) => {
  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { category: categorySelect },
    }),
    prisma.product.count({ where }),
  ]);
  return { products, total };
};

const findProductById = (id) => prisma.product.findUnique({ where: { id } });

// public: active only
const findActiveProductBySlug = (slug) =>
  prisma.product.findUnique({
    where: { slug, isActive: true },
    include: { category: categorySelect },
  });

// uniqueness check: ignores isActive
const slugExists = async (slug) => {
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  });
  return product !== null;
};

const createProduct = (data) => prisma.product.create({ data });

const updateProduct = (id, data) =>
  prisma.product.update({ where: { id }, data });

const restockProduct = (id, quantity) =>
  prisma.product.update({
    where: { id },
    data: { stock: { increment: quantity } },
  });

const softDeleteProduct = (id) =>
  prisma.product.update({ where: { id }, data: { isActive: false } });

// atomic: only decrements if enough stock and still active; returns { count }
const decrementStock = (id, quantity, db = prisma) =>
  db.product.updateMany({
    where: { id, isActive: true, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });

const incrementStock = (id, quantity, db = prisma) =>
  db.product.update({
    where: { id },
    data: { stock: { increment: quantity } },
  });

export default {
  countProductsByCategory,
  findAllProducts,
  findProductById,
  findActiveProductBySlug,
  slugExists,
  createProduct,
  updateProduct,
  restockProduct,
  softDeleteProduct,
  decrementStock,
  incrementStock,
};
