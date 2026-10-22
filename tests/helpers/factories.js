import bcrypt from "bcrypt";
import request from "supertest";
import app from "../../src/app.js";
import prisma from "../../src/config/prisma.js";
import slugify from "../../src/utils/slugify.js";

export async function createUser({
  role = "customer",
  name = "Test User",
  email = `user${Date.now()}${Math.random()}@test.com`,
  password = "Password123!",
} = {}) {
  const hashedPassword = await bcrypt.hash(password, 4);

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, role },
  });

  return { ...user, plainPassword: password };
}

export async function loginAs(user) {
  const agent = request.agent(app);

  await agent
    .post("/api/v1/auth/login")
    .send({
      email: user.email,
      password: user.plainPassword,
    })
    .expect(200);

  return agent;
}

export async function createCategory({ name = "Test Category" } = {}) {
  return prisma.category.create({
    data: {
      name,
      slug: slugify(name, { lower: true, strict: true }),
    },
  });
}

export async function createProduct({
  stock = 10,
  price = 50,
  isActive = true,
  categoryId,
  name = `Test Product ${Date.now()}-${Math.random()}`,
} = {}) {
  let resolvedCategoryId = categoryId;

  if (!resolvedCategoryId) {
    const category = await createCategory({
      name: `Test Category ${Date.now()}-${Math.random()}`,
    });

    resolvedCategoryId = category.id;
  }

  return prisma.product.create({
    data: {
      name,
      slug: slugify(name, { lower: true, strict: true }),
      stock,
      price,
      isActive,
      images: [],
      categoryId: resolvedCategoryId,
    },
  });
}

export async function addToCart(agent, productId, quantity = 1) {
  return agent
    .post("/api/v1/carts/items")
    .send({ productId, quantity })
    .expect(200);
}

export const shipping = {
  shippingAddress: "123 Test Street",
  shippingCity: "Ibadan",
  shippingState: "Oyo",
  shippingZip: "200001",
  shippingCountry: "Nigeria",
  phone: "08012345678",
};

export async function placeOrder(agent, productId, quantity = 1) {
  await addToCart(agent, productId, quantity);

  const response = await agent
    .post("/api/v1/orders")
    .send(shipping)
    .expect(201);

  return response.body.data;
}
