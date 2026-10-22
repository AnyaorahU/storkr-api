import prisma from "../../config/prisma.js";

const findAllCategories = async () => {
  return await prisma.category.findMany();
};

const findCategoryById = async (id) => {
  return await prisma.category.findUnique({ where: { id } });
};

const findCategoryBySlug = async (slug) => {
  return await prisma.category.findUnique({ where: { slug } });
};

const createCategory = async ({ name, slug, description, image }) => {
  return await prisma.category.create({
    data: { name, slug, description, image },
  });
};

const updateCategory = async ({ id, data }) => {
  return await prisma.category.update({ where: { id }, data });
};

const deleteCategory = async (id) => {
  return await prisma.category.delete({ where: { id } });
};

export default {
  findAllCategories,
  findCategoryById,
  findCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
