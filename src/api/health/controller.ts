import { Request, Response } from 'express';
import companiesHouseApi from '../../services/companiesHouseApi';
import pool from '../../config/database';
import redis from '../../config/redis';

export const healthController = async (req: Request, res: Response) => {
  const status: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };

  // Check database
  try {
    if (pool) {
      await pool.query('SELECT 1');
      status.database = 'connected';
    } else {
      status.database = 'not configured';
    }
  } catch (error) {
    status.database = 'error';
  }

  // Check Redis
  try {
    if (redis) {
      await redis.ping();
      status.redis = 'connected';
    } else {
      status.redis = 'not configured';
    }
  } catch (error) {
    status.redis = 'error';
  }

  // Check Companies House API
  try {
    // Test with a simple company search
    const testResult = await companiesHouseApi.searchCompanies('test', 1, 1);
    status.companiesHouseApi = 'connected';
    status.apiKeyValid = true;
  } catch (error: any) {
    status.companiesHouseApi = 'error';
    status.apiKeyValid = false;
    status.apiError = error.message;
  }

  // Check environment variables
  status.environment = {
    hasApiKey: !!process.env.CH_API_KEY,
    apiKeyLength: process.env.CH_API_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    hasPostgresUrl: !!process.env.POSTGRES_URL,
    hasRedisUrl: !!process.env.REDIS_URL
  };

  const overallStatus = status.companiesHouseApi === 'connected' ? 200 : 503;
  res.status(overallStatus).json(status);
};