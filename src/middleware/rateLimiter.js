import rateLimit from "express-rate-limit";

const MINUTE = 60 * 1000;

const limiterOptions = (windowMinutes, limit, action) => ({
  windowMs: windowMinutes * MINUTE,
  limit,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: `Too many ${action} attempts. Please try again in ${windowMinutes} minutes.`,
  },
});

// only failed logins count, so real users aren't locked out by successful logins
export const loginLimiter = rateLimit({
  ...limiterOptions(15, 10, "login"),
  skipSuccessfulRequests: true,
});

export const registerLimiter = rateLimit(limiterOptions(60, 5, "registration"));
