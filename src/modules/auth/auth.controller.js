import AppError from "../../utils/appError.js";
import authService from "./auth.service.js";

const register = async (req, res) => {
  const { name, email, password } = req.body;

  const { user, token } = await authService.register({
    name,
    email,
    password,
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 10 * 60 * 60 * 1000,
  });

  return res.status(201).json({
    success: true,
    message: "registered successful",
    data: user,
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const { user, token } = await authService.login({ email, password });

  res.cookie("token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: 10 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    success: true,
    message: "welcome back",
    data: user,
  });
};

const getMe = async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    throw new AppError("Unauthorized", 401);
  }
  res.status(200).json({
    success: true,
    data: req.user,
  });
};

const logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  res.status(200).json({
    success: true,
    message: "Logged out",
  });
};

export default { register, login, getMe, logout };
