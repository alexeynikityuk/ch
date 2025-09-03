import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let pool: Pool | null = null;

// Only create database pool if DATABASE_URL is provided
if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    pool.on('error', (err) => {
      console.error('Database pool error:', err);
      // Don't exit process, just log the error
    });

    pool.on('connect', () => {
      console.log('Connected to PostgreSQL database');
    });
  } catch (error) {
    console.warn('Failed to create database pool, database operations will be disabled', error);
    pool = null;
  }
} else {
  console.warn('DATABASE_URL not provided, database operations will be disabled');
}

export default pool;