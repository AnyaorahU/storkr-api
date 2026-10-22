import categoryService from "./category.service.js";

const findAllCategories = async (req, res) => {
  const result = await categoryService.findAllCategories();

  return res.status(200).json({
    success: true,
    data: result,
  });
};

const findCategoryById = async (req, res) => {
  const { id } = req.params;

  const result = await categoryService.findCategoryById(id);

  return res.status(200).json({
    success: true,
    data: result,
  });
};

const findCategoryBySlug = async (req, res) => {
  const { slug } = req.params;

  const result = await categoryService.findCategoryBySlug(slug);

  return res.status(200).json({
    success: true,
    data: result,
  });
};

const createCategory = async (req, res) => {
  const { name, slug, description, image } = req.body;

  const result = await categoryService.createCategory({
    name,
    slug,
    description,
    image,
  });

  return res.status(201).json({
    success: true,
    message: "Category created",
    data: result,
  });
};

const updateCategory = async (req, res) => {
  const data = req.body;
  const { id } = req.params;

  const result = await categoryService.updateCategory({ id, data });

  return res.status(200).json({
    success: true,
    message: "Category updated",
    data: result,
  });
};

const deleteCategory = async (req, res) => {
  const { id } = req.params;

  await categoryService.deleteCategory(id);

  return res.status(200).json({
    success: true,
    message: "Category deleted",
  });
};

export default {
  findAllCategories,
  findCategoryById,
  findCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
