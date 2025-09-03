import axios from 'axios';
import redis from '../config/redis';
import pool from '../config/database';
import { AppError } from '../middleware/errorHandler';

export interface Officer {
  name: string;
  officer_role: string;
  appointed_on: string;
  resigned_on?: string;
  date_of_birth?: {
    month: number;
    year: number;
  };
  nationality?: string;
  country_of_residence?: string;
  occupation?: string;
  address?: any;
}

export interface OfficerList {
  items: Officer[];
  active_count: number;
  resigned_count: number;
  total_results: number;
}

class OfficerService {
  private apiClient = axios.create({
    baseURL: 'https://api.company-information.service.gov.uk',
    auth: {
      username: process.env.CH_API_KEY || '',
      password: ''
    },
    timeout: 30000
  });
  
  constructor() {
    // Ensure API key is loaded
    if (!process.env.CH_API_KEY) {
      console.error('OfficerService: CH_API_KEY not found in environment');
    }
    
    // Add retry logic for rate limits
    this.apiClient.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '5');
          console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.apiClient.request(error.config);
        }
        throw error;
      }
    );
  }

  async getCompanyOfficers(companyNumber: string): Promise<OfficerList> {
    // 1. Check PostgreSQL cache first (most reliable)
    if (pool) {
      try {
        const cacheResult = await pool.query(
          'SELECT officers_data FROM company_officers_cache WHERE company_number = $1 AND expires_at > NOW()',
          [companyNumber]
        );
        
        if (cacheResult.rows.length > 0) {
          return cacheResult.rows[0].officers_data as OfficerList;
        }
      } catch (error) {
        console.warn('Database cache read failed:', error);
      }
    }
    
    // 2. Check Redis cache as fallback
    const cacheKey = `officers:${companyNumber}`;
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.warn('Redis cache read failed:', error);
      }
    }

    // 3. Fetch from API if not in cache
    try {
      const response = await this.apiClient.get(`/company/${companyNumber}/officers`);
      const data = response.data as OfficerList;
      
      // 4. Cache in PostgreSQL (30 days)
      if (pool) {
        try {
          await pool.query(
            `INSERT INTO company_officers_cache 
             (company_number, officers_data, total_results, active_count, resigned_count) 
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (company_number) 
             DO UPDATE SET 
               officers_data = $2,
               total_results = $3,
               active_count = $4,
               resigned_count = $5,
               fetched_at = CURRENT_TIMESTAMP,
               expires_at = CURRENT_TIMESTAMP + INTERVAL '30 days'`,
            [
              companyNumber,
              JSON.stringify(data),
              data.total_results || 0,
              data.active_count || 0,
              data.resigned_count || 0
            ]
          );
        } catch (error) {
          console.warn('Database cache write failed:', error);
        }
      }
      
      // 5. Also cache in Redis for speed (24 hours)
      if (redis) {
        try {
          await redis.setex(cacheKey, 86400, JSON.stringify(data));
        } catch (error) {
          console.warn('Redis cache write failed:', error);
        }
      }
      
      return data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new AppError(`Company ${companyNumber} not found`, 404);
      }
      throw error;
    }
  }

  hasOfficerWithBirthYear(officers: OfficerList, birthYearBefore: number): boolean {
    return officers.items.some(officer => {
      // Only check active officers (no resigned_on date)
      if (officer.resigned_on) return false;
      
      // Check if birth year is before the specified year
      const officerBirthYear = officer.date_of_birth?.year;
      return officerBirthYear !== undefined && officerBirthYear < birthYearBefore;
    });
  }

  getActiveOfficersWithBirthYear(officers: OfficerList, birthYearBefore: number): Officer[] {
    return officers.items.filter(officer => {
      // Only include active officers
      if (officer.resigned_on) return false;
      
      // Check if birth year is before the specified year
      const officerBirthYear = officer.date_of_birth?.year;
      return officerBirthYear !== undefined && officerBirthYear < birthYearBefore;
    });
  }

  async getCacheStats(): Promise<{
    totalCached: number;
    cacheSize: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    if (!pool) {
      return { totalCached: 0, cacheSize: 0, oldestEntry: null, newestEntry: null };
    }

    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_cached,
          SUM(LENGTH(officers_data::text)) as cache_size,
          MIN(fetched_at) as oldest_entry,
          MAX(fetched_at) as newest_entry
        FROM company_officers_cache
        WHERE expires_at > NOW()
      `);

      const row = result.rows[0];
      return {
        totalCached: parseInt(row.total_cached) || 0,
        cacheSize: parseInt(row.cache_size) || 0,
        oldestEntry: row.oldest_entry,
        newestEntry: row.newest_entry
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return { totalCached: 0, cacheSize: 0, oldestEntry: null, newestEntry: null };
    }
  }
}

export default new OfficerService();