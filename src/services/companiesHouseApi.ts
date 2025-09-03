import axios, { AxiosInstance, AxiosError } from 'axios';
import { CompanyResult, CompanySearchFilters } from '../types';
import { AppError } from '../middleware/errorHandler';
import redis from '../config/redis';
import officerService from './officerService';

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

  async advancedSearch(filters: CompanySearchFilters, startIndex: number = 0, size: number = 100): Promise<any> {
    const params: any = {
      size: size.toString(),
      start_index: startIndex.toString()
    };

    // Add filters to params
    if (filters.keyword) {
      params.company_name_includes = filters.keyword;
    }
    
    if (filters.company_status && filters.company_status.length > 0) {
      params.company_status = filters.company_status.join(',');
    }
    
    if (filters.company_type && filters.company_type.length > 0) {
      params.company_type = filters.company_type.join(',');
    }
    
    if (filters.incorporated_from) {
      params.incorporated_from = filters.incorporated_from;
    }
    
    if (filters.incorporated_to) {
      params.incorporated_to = filters.incorporated_to;
    }
    
    if (filters.sic && filters.sic.length > 0) {
      params.sic_codes = filters.sic.join(',');
    }
    
    if (filters.locality) {
      params.location = filters.locality;
    }

    try {
      const response = await this.client.get('/advanced-search/companies', { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
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

  async searchWithFilters(filters: CompanySearchFilters, page: number, pageSize: number, progressCallback?: (current: number, total: number) => void): Promise<{
    items: CompanyResult[];
    total: number;
  }> {
    // Check if we need to filter by officer birth year
    if (filters.officer_birth_year) {
      return this.searchWithOfficerFilter(filters, page, pageSize, progressCallback);
    }
    
    // Use advanced search API which supports all our filters directly!
    const startIndex = (page - 1) * pageSize;
    
    try {
      const searchResult = await this.advancedSearch(filters, startIndex, pageSize);
      
      // Convert to our format
      const items: CompanyResult[] = (searchResult.items || []).map((company: any) => ({
        company_number: company.company_number,
        company_name: company.company_name,
        status: company.company_status,
        type: company.company_type,
        incorporation_date: company.date_of_creation,
        registered_office: {
          postal_code: company.registered_office_address?.postal_code,
          locality: company.registered_office_address?.locality,
          region: company.registered_office_address?.region,
          country: company.registered_office_address?.country
        },
        sic_codes: company.sic_codes || []
      }));

      return {
        items,
        total: searchResult.hits || searchResult.total_results || 0
      };
    } catch (error: any) {
      // If advanced search fails, provide helpful error message
      if (error.response?.status === 404) {
        throw new AppError('Advanced search endpoint not available. Please ensure you have proper API access.', 503);
      }
      throw error;
    }
  }

  private async searchWithOfficerFilter(filters: CompanySearchFilters, page: number, pageSize: number, progressCallback?: (current: number, total: number) => void): Promise<{
    items: CompanyResult[];
    total: number;
  }> {
    // First, get companies without officer filter
    const birthYear = filters.officer_birth_year!;
    const filtersWithoutOfficer = { ...filters };
    delete filtersWithoutOfficer.officer_birth_year;
    
    // Fetch ALL companies matching the filters (without officer filter)
    // Note: This could be thousands of companies, so searches may take longer
    const MAX_RESULTS = 5000; // Companies House API typically limits to 5000 results
    
    // Fetch initial companies
    const searchResult = await this.advancedSearch(filtersWithoutOfficer, 0, MAX_RESULTS);
    const allCompanies = searchResult.items || [];
    const totalToCheck = allCompanies.length;
    
    if (totalToCheck > 100) {
      console.log(`Officer search: Checking ${totalToCheck} companies. This may take several minutes...`);
    }
    
    // Get cache stats to show hit rate
    const cacheStats = await officerService.getCacheStats();
    console.log(`Officer cache contains ${cacheStats.totalCached} companies`);
    
    // Send initial progress
    if (progressCallback) {
      console.log(`Sending initial progress: 0/${totalToCheck}`);
      progressCallback(0, totalToCheck);
    }
    
    // Filter companies by officer birth year
    const companiesWithMatchingOfficers: CompanyResult[] = [];
    const BATCH_SIZE = 10; // Process 10 companies in parallel
    const DELAY_BETWEEN_BATCHES = 200; // ms
    
    for (let i = 0; i < totalToCheck; i += BATCH_SIZE) {
      const batch = allCompanies.slice(i, Math.min(i + BATCH_SIZE, totalToCheck));
      
      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (company: any) => {
          try {
            const officers = await officerService.getCompanyOfficers(company.company_number);
            
            if (officerService.hasOfficerWithBirthYear(officers, birthYear)) {
              return {
                company_number: company.company_number,
                company_name: company.company_name,
                status: company.company_status,
                type: company.company_type,
                incorporation_date: company.date_of_creation,
                registered_office: {
                  postal_code: company.registered_office_address?.postal_code,
                  locality: company.registered_office_address?.locality,
                  region: company.registered_office_address?.region,
                  country: company.registered_office_address?.country
                },
                sic_codes: company.sic_codes || []
              };
            }
            return null;
          } catch (error) {
            console.warn(`Failed to check officers for company ${company.company_number}:`, error);
            return null;
          }
        })
      );
      
      // Add matching companies
      companiesWithMatchingOfficers.push(...batchResults.filter((c): c is CompanyResult => c !== null));
      
      // Update progress
      const currentProgress = Math.min(i + BATCH_SIZE, totalToCheck);
      if (progressCallback) {
        console.log(`Sending progress: ${currentProgress}/${totalToCheck}`);
        progressCallback(currentProgress, totalToCheck);
      }
      
      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < totalToCheck) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    // Apply pagination to filtered results
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = companiesWithMatchingOfficers.slice(startIndex, startIndex + pageSize);
    
    return {
      items: paginatedItems,
      total: companiesWithMatchingOfficers.length
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