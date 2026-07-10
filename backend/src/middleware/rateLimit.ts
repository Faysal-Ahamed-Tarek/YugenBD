import rateLimit, { type Options } from "express-rate-limit";

/** Shared 429 response in the project's error envelope. */
const handler: Options["handler"] = (_req, res) => {
  res.status(429).json({
    success: false,
    message: "Too many requests. Please slow down and try again shortly.",
  });
};

const base = {
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,
  handler,
} satisfies Partial<Options>;

/**
 * Read limiter for fetching reviews. Generous, since the storefront's RSC
 * fetches are cached and may share one origin IP.
 */
export const reviewReadLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000, // 1 minute
  limit: 120,
});

/**
 * Write limiter for submitting reviews — strict, per client IP, to curb
 * spam and abuse of the public (unauthenticated) create endpoint.
 */
export const reviewWriteLimiter = rateLimit({
  ...base,
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 5,
});

/** Strict limiter for placing orders — curbs spam orders per client IP. */
export const orderCreateLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
});

/** Generous limiter for reading an order / downloading its PDF. */
export const orderReadLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000, // 1 minute
  limit: 30,
});

/** Auth limiter for login + change-password — curbs credential brute force. */
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
});
