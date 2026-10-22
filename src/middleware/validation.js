import AppError from "../utils/appError.js";

const validation = (schema, source = "body") => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      throw new AppError(result.error.issues[0].message, 400);
    }
    if (source === "query") {
      req.validatedQuery = result.data;
    } else {
      req[source] = result.data;
    }
    next();
  };
};

export default validation;
