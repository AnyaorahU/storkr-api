import AppError from "../../utils/appError.js";
import productRepository from "../product/product.repository.js";
import categoryRepository from "./category.repository.js";

const findAllCategories = async () => {
  const result = await categoryRepository.findAllCategories();

  return result;
};

const findCategoryById = async (id) => {
  const result = await categoryRepository.findCategoryById(id);
  if (!result) {
    throw new AppError("Category not found", 404);
  }

  return result;
};

const findCategoryBySlug = async (slug) => {
  const result = await categoryRepository.findCategoryBySlug(slug);
  if (!result) {
    throw new AppError("Category not found", 404);
  }

  return result;
};

const createCategory = async ({ name, slug, description, image }) => {
  const exists = await categoryRepository.findCategoryBySlug(slug);
  if (exists) {
    throw new AppError("Slug already exists", 409);
  }

  const result = await categoryRepository.createCategory({
    name,
    slug,
    description,
    image,
  });

  return result;
};

const updateCategory = async ({ id, data }) => {
  const { name, slug, description, image } = data;

  const category = await categoryRepository.findCategoryById(id);
  if (!category) throw new AppError("Category not found", 404);

  const updatedData = {
    name: name ?? category.name,
    slug: slug ?? category.slug,
    description: description ?? category.description,
    image: image ?? category.image,
  };

  const updated = await categoryRepository.updateCategory({
    id,
    data: updatedData,
  });

  return updated;
};

const deleteCategory = async (id) => {
  const category = await categoryRepository.findCategoryById(id);
  if (!category) {
    throw new AppError("Category not found", 404);
  }

  const productCount = await productRepository.countProductsByCategory(id);
  if (productCount > 0) {
    throw new AppError("Cannot delete category with existing products", 409);
  }

  await categoryRepository.deleteCategory(id);

  return category;
};

export default {
  findAllCategories,
  findCategoryById,
  findCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
