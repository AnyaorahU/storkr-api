import bcrypt from "bcrypt";
import prisma from "../src/config/prisma.js";
import slugify from "../src/utils/slugify.js";

// Admin
const seedAdmin = async () => {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env",
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Ghoststack",
      email,
      password: hashedPassword,
      role: "admin",
    },
  });
};

// category
const categories = [
  { name: "Electronics", description: "Gadgets, audio and accessories" },
  {
    name: "Home & Kitchen",
    description: "Home essentials, cookware and appliances",
  },
  {
    name: "Books",
    description: "Books, novels and educational materials",
  },
];

const seedCategories = async () => {
  const ids = {};

  for (const { name, description } of categories) {
    const slug = slugify(name);
    const category = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug, description },
    });
    ids[name] = category.id;
  }

  return ids;
};

//product
const products = [
  {
    name: "Wireless Headphones",
    description: "Noise-cancelling over-ear headphones with 30-hour battery.",
    price: 79.99,
    stock: 50,
    category: "Electronics",
    images: ["https://example.com/images/headphones-1.jpg"],
  },
  {
    name: "Bluetooth Speaker",
    description: "Portable wireless speaker with rich stereo sound.",
    price: 49.99,
    stock: 35,
    category: "Electronics",
    images: ["https://example.com/images/bluetooth-speaker.jpg"],
  },
  {
    name: "USB-C Fast Charger",
    description: "Compact 30W USB-C charger for compatible devices.",
    price: 19.99,
    stock: 100,
    category: "Electronics",
    images: ["https://example.com/images/usb-c-charger.jpg"],
  },
  {
    name: "Stainless Steel Cookware Set",
    description: "Durable cookware set for everyday home cooking.",
    price: 129.99,
    stock: 20,
    category: "Home & Kitchen",
    images: ["https://example.com/images/cookware-set.jpg"],
  },
  {
    name: "Electric Kettle",
    description: "1.7-litre electric kettle with automatic shut-off.",
    price: 34.99,
    stock: 0,
    category: "Home & Kitchen",
    images: ["https://example.com/images/electric-kettle.jpg"],
  },
  {
    name: "Ceramic Dinner Plate Set",
    description: "Elegant ceramic dinner plates for everyday dining.",
    price: 39.99,
    stock: 25,
    category: "Home & Kitchen",
    images: ["https://example.com/images/dinner-plates.jpg"],
  },
  {
    name: "The Pragmatic Programmer",
    description: "A practical guide to software development and craftsmanship.",
    price: 44.99,
    stock: 15,
    category: "Books",
    images: ["https://example.com/images/pragmatic-programmer.jpg"],
  },
  {
    name: "JavaScript for Beginners",
    description: "An introductory guide to JavaScript programming.",
    price: 24.99,
    stock: 30,
    category: "Books",
    images: ["https://example.com/images/javascript-book.jpg"],
    isActive: false,
  },
];

const seedProducts = async (categoryIds) => {
  let count = 0;

  for (const { category, ...product } of products) {
    const slug = slugify(product.name);
    const categoryId = categoryIds[category];
    if (!categoryId)
      throw new Error(
        `Category "${category}" not found. Seed categories first.`,
      );
    await prisma.product.upsert({
      where: { slug },
      update: {},
      create: { ...product, slug, categoryId },
    });
    count++;
  }
  return count;
};

// main
const main = async () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed in production");
  }
  const admin = await seedAdmin();
  const categoryIds = await seedCategories();
  const productCount = await seedProducts(categoryIds);
  console.log(`Admin ready: ${admin.email}`);
  console.log(`Categories ready: ${Object.keys(categoryIds).length}`);
  console.log(`Products ready: ${productCount}`);
};

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
