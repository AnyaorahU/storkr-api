import authRepository from "../modules/auth/auth.repository.js";
import AppError from "../utils/appError.js";
import jwt from "../utils/jwt.js";

const authMiddleware = async (req, res, next) => {
  try {
    // console.log("Auth middleware executed");
    // console.log("Cookies:", req.cookies);
    // console.log("Token exists:", Boolean(req.cookies?.token));

    const token = req.cookies.token;
    if (!token) {
      throw new AppError("Unauthorized", 401);
    }

    const payload = await jwt.verifyToken(token);
    if (!payload) {
      throw new AppError("Unauthorized", 401);
    }
    const user = await authRepository.findUserById(payload.id);
    if (!user) {
      throw new AppError("Unauthorized", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return next(new AppError("Unauthorized", 401));
    }
    next(error);
  }
};

export default authMiddleware;
