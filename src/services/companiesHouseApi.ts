import axios, { AxiosInstance, AxiosError } from 'axios';
import { CompanyResult, CompanySearchFilters } from '../types';
import { AppError } from '../middleware/errorHandler';
import redis from '../config/redis';

export class CompaniesHouseAPI {
  private client: AxiosInstance;
  private apiKey: string;
  private requestQueue: Promise<any>[] = [];
  private maxConcurrentRequests = 5;

  constructor() {
    this.apiKey = process.env.CH_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('CH_API_KEY is not set in environment variables');
    }
    
    // API key loaded successfully

    this.client = axios.create({
      baseURL: 'https://api.company-information.service.gov.uk',
      auth: {
        username: this.apiKey,
        password: ''
      },
      headers: {
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to ensure auth header is set
    this.client.interceptors.request.use(
      config => {
        // Manually set Basic Auth header to ensure it's correct
        const credentials = Buffer.from(`${this.apiKey}:`).toString('base64');
        config.headers['Authorization'] = `Basic ${credentials}`;
        
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || 5;
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.client.request(error.config);
        }
        
        // Error will be handled by handleError method
        
        throw error;
      }
    );
  }

  async searchCompanies(keyword: string, page: number = 1, itemsPerPage: number = 20): Promise<any> {
    const cacheKey = `search:${keyword}:${page}:${itemsPerPage}`;
    
    // Check cache if Redis is available
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    try {
      const response = await this.client.get('/search/companies', {
        params: {
          q: keyword,
          items_per_page: itemsPerPage,
          start_index: (page - 1) * itemsPerPage
        }
      });

      const data = response.data;
      
      // Cache result if Redis is available
      if (redis) {
        await redis.setex(cacheKey, 600, JSON.stringify(data)); // Cache for 10 minutes
      }
      
      return data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getCompanyProfile(companyNumber: string): Promise<any> {
    const cacheKey = `company:${companyNumber}`;
    
    // Check cache if Redis is available
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    try {
      const response = await this.client.get(`/company/${companyNumber}`);
      const data = response.data;
      
      // Cache result if Redis is available
      if (redis) {
        await redis.setex(cacheKey, 86400, JSON.stringify(data)); // Cache for 24 hours
      }
      
      return data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async searchWithFilters(filters: CompanySearchFilters, page: number, pageSize: number): Promise<{
    items: CompanyResult[];
    total: number;
  }> {
    let allCompanies: any[] = [];
    let totalItems = 0;

    // First, search by keyword if provided
    if (filters.keyword) {
      const searchResult = await this.searchCompanies(filters.keyword, 1, 100);
      allCompanies = searchResult.items || [];
      totalItems = searchResult.total_results || 0;
    } else {
      // If no keyword, we need to implement a different strategy
      // This is a limitation of the Companies House API
      throw new AppError('Keyword is required for search', 400);
    }

    // Enrich with profile data and filter
    const enrichedCompanies = await this.enrichCompaniesWithProfiles(allCompanies, filters);

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = enrichedCompanies.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      total: enrichedCompanies.length
    };
  }

  private async enrichCompaniesWithProfiles(companies: any[], filters: CompanySearchFilters): Promise<CompanyResult[]> {
    const enrichedCompanies: CompanyResult[] = [];

    // Process in batches to respect rate limits
    for (let i = 0; i < companies.length; i += this.maxConcurrentRequests) {
      const batch = companies.slice(i, i + this.maxConcurrentRequests);
      const enrichedBatch = await Promise.all(
        batch.map(async (company) => {
          try {
            const profile = await this.getCompanyProfile(company.company_number);
            return this.mapToCompanyResult(profile);
          } catch (error) {
            console.error(`Failed to enrich company ${company.company_number}:`, error);
            return null;
          }
        })
      );

      const filteredBatch = enrichedBatch
        .filter(company => company !== null)
        .filter(company => this.matchesFilters(company!, filters));

      enrichedCompanies.push(...filteredBatch as CompanyResult[]);
    }

    return enrichedCompanies;
  }

  private mapToCompanyResult(profile: any): CompanyResult {
    return {
      company_name: profile.company_name,
      company_number: profile.company_number,
      status: profile.company_status,
      type: profile.type,
      sic_codes: profile.sic_codes,
      incorporation_date: profile.date_of_creation,
      registered_office: {
        locality: profile.registered_office_address?.locality,
        postal_code: profile.registered_office_address?.postal_code
      }
    };
  }

  private matchesFilters(company: CompanyResult, filters: CompanySearchFilters): boolean {
    // Status filter
    if (filters.company_status && filters.company_status.length > 0) {
      if (!filters.company_status.includes(company.status)) {
        return false;
      }
    }

    // Type filter
    if (filters.company_type && filters.company_type.length > 0) {
      if (!filters.company_type.includes(company.type)) {
        return false;
      }
    }

    // SIC codes filter
    if (filters.sic && filters.sic.length > 0) {
      if (!company.sic_codes || !company.sic_codes.some(code => 
        filters.sic!.some(filterCode => code.startsWith(filterCode))
      )) {
        return false;
      }
    }

    // Date range filter
    if (filters.incorporated_from || filters.incorporated_to) {
      if (!company.incorporation_date) {
        return false;
      }
      
      const incorporationDate = new Date(company.incorporation_date);
      
      if (filters.incorporated_from && incorporationDate < new Date(filters.incorporated_from)) {
        return false;
      }
      
      if (filters.incorporated_to && incorporationDate > new Date(filters.incorporated_to)) {
        return false;
      }
    }

    // Postcode filter
    if (filters.postcode_prefix) {
      if (!company.registered_office?.postal_code || 
          !company.registered_office.postal_code.toUpperCase().startsWith(filters.postcode_prefix.toUpperCase())) {
        return false;
      }
    }

    // Locality filter
    if (filters.locality) {
      if (!company.registered_office?.locality || 
          !company.registered_office.locality.toLowerCase().includes(filters.locality.toLowerCase())) {
        return false;
      }
    }

    return true;
  }

  private handleError(error: any): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status || 500;
      const message = (axiosError.response?.data as any)?.error || 'Companies House API error';
      
      throw new AppError(message, status);
    }
    throw error;
  }
}

export default new CompaniesHouseAPI();