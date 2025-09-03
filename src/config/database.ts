import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let pool: Pool | null = null;

// Use POSTGRES_URL (Vercel/Neon) or DATABASE_URL
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

// Only create database pool if connection string is provided
if (connectionString) {
  try {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
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
  console.warn('Database connection string not provided (POSTGRES_URL or DATABASE_URL), database operations will be disabled');
}

export default pool;