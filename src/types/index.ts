export interface CompanySearchFilters {
  keyword?: string;
  company_status?: string[];
  company_type?: string[];
  sic?: string[];
  incorporated_from?: string;
  incorporated_to?: string;
  postcode_prefix?: string;
  locality?: string;
  officer_birth_year?: number; // Filter for officers born before this year
}

export interface CompanyResult {
  company_name: string;
  company_number: string;
  status: string;
  type: string;
  sic_codes?: string[];
  incorporation_date?: string;
  registered_office?: {
    locality?: string;
    postal_code?: string;
  };
}

export interface SearchRequest {
  filters: CompanySearchFilters;
  page: number;
  page_size: number;
}

export interface SearchResponse {
  items: CompanyResult[];
  page: number;
  total_estimated: number;
  result_token: string;
}

export interface FilterPreset {
  id: string;
  user_id: string;
  name: string;
  filters: CompanySearchFilters;
  created_at: Date;
}