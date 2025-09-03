import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import redis from '../config/redis';
import { AppError } from './errorHandler';

// Use Redis rate limiter if available, otherwise use in-memory rate limiter
const rateLimiterOptions = {
  keyPrefix: 'middleware',
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000') / 1000, // Convert to seconds
};

const rateLimiter = redis
  ? new RateLimiterRedis({
      storeClient: redis,
      ...rateLimiterOptions,
    })
  : new RateLimiterMemory(rateLimiterOptions);

export const rateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await rateLimiter.consume(req.ip || 'anonymous');
    next();
  } catch (rejRes: any) {
    const retryAfter = Math.round(rejRes.msBeforeNext / 1000) || 60;
    res.set('Retry-After', String(retryAfter));
    res.set('X-RateLimit-Limit', String(rateLimiter.points));
    res.set('X-RateLimit-Remaining', String(rejRes.remainingPoints || 0));
    res.set('X-RateLimit-Reset', String(Date.now() + rejRes.msBeforeNext));
    
    next(new AppError('Too Many Requests', 429));
  }
};