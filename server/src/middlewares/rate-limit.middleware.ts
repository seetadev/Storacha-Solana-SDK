import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  // 10 uploads per hour per IP. this should be okay. we can increase or reduce as time goes on.
  max: 10,
  message: "Too many upload requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// export const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   // 20 per 15 minutes
//   max: 20,
//   message: "Too many authentication attempts, please try again later",
//   standardHeaders: true,
//   legacyHeaders: false,
// });
