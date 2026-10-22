const asyncHandler = (fn) => {
  return async (req, res, next) => {
    await Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };
};

export default asyncHandler;
