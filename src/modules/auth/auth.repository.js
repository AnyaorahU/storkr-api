import prisma from "../../config/prisma.js";

const findUserByEmail = async (email) => {
  const result = await prisma.user.findUnique({ where: { email } });

  return result;
};

const findUserById = async (id) => {
  const result = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return result;
};

const createUser = async ({ name, email, password }) => {
  const result = await prisma.user.create({ data: { name, email, password } });

  return result;
};

export default { findUserByEmail, createUser, findUserById };
