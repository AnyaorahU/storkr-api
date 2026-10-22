import jwt from "jsonwebtoken";
import { JWT_EXPIRES, JWT_SECRET } from "../config/env.js";

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

export default { generateToken, verifyToken };
