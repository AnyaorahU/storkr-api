import bcrypt from "bcrypt";

import AppError from "../../utils/appError.js";
import authRepository from "./auth.repository.js";
import jwt from "../../utils/jwt.js";

const register = async ({ name, email, password }) => {
  const exists = await authRepository.findUserByEmail(email);
  if (exists) {
    throw new AppError("Email already exists", 409);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const user = await authRepository.createUser({
    name,
    email,
    password: hashedPassword,
  });

  const token = await jwt.generateToken(user.id);

  const { password: _, ...safeUser } = user;

  return { user: safeUser, token };
};

const login = async ({ email, password }) => {
  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    throw new AppError("invalid credentials", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError("invalid credentials", 401);
  }

  const token = await jwt.generateToken(user.id);

  const { password: _, ...safeUser } = user;

  return { user: safeUser, token };
};

export default { register, login };
