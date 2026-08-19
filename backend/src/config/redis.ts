import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  maxRetriesPerRequest: null,
});