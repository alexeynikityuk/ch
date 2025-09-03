import axios from 'axios';
import redis from '../config/redis';
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
    }
  });

  async getCompanyOfficers(companyNumber: string): Promise<OfficerList> {
    const cacheKey = `officers:${companyNumber}`;
    
    // Check cache first
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.warn('Cache read failed:', error);
      }
    }

    try {
      const response = await this.apiClient.get(`/company/${companyNumber}/officers`);
      const data = response.data;
      
      // Cache for 24 hours
      if (redis) {
        try {
          await redis.setex(cacheKey, 86400, JSON.stringify(data));
        } catch (error) {
          console.warn('Cache write failed:', error);
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
}

export default new OfficerService();