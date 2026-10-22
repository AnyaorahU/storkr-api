const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : "internal server error";

  if (!err.isOperational) {
    console.error("UNEXPECTED ERROR:", err);
  }

  res.status(statusCode).json({
    success: false,
    message: message,
  });
};

export default errorMiddleware;
