import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redis: Redis | null = null;

// Only create Redis client if REDIS_URL is provided
if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL);
    
    redis.on('error', (err) => {
      console.error('Redis Client Error', err);
    });
    
    redis.on('connect', () => {
      console.log('Connected to Redis');
    });
  } catch (error) {
    console.warn('Failed to connect to Redis, caching will be disabled', error);
    redis = null;
  }
} else {
  console.warn('REDIS_URL not provided, caching will be disabled');
}

export default redis;