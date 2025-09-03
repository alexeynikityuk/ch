import { CompanySearchFilters } from '../types';

export const validateSearchFilters = (filters: CompanySearchFilters): string[] => {
  const errors: string[] = [];

  // Validate date formats
  if (filters.incorporated_from && !isValidDate(filters.incorporated_from)) {
    errors.push('incorporated_from must be a valid date in YYYY-MM-DD format');
  }

  if (filters.incorporated_to && !isValidDate(filters.incorporated_to)) {
    errors.push('incorporated_to must be a valid date in YYYY-MM-DD format');
  }

  // Validate date range
  if (filters.incorporated_from && filters.incorporated_to) {
    const fromDate = new Date(filters.incorporated_from);
    const toDate = new Date(filters.incorporated_to);
    if (fromDate > toDate) {
      errors.push('incorporated_from must be before incorporated_to');
    }
  }

  // Validate company status values
  const validStatuses = ['active', 'dissolved', 'liquidation', 'receivership', 'converted-closed', 'voluntary-arrangement', 'insolvency-proceedings', 'administration'];
  if (filters.company_status) {
    const invalidStatuses = filters.company_status.filter(status => !validStatuses.includes(status));
    if (invalidStatuses.length > 0) {
      errors.push(`Invalid company_status values: ${invalidStatuses.join(', ')}`);
    }
  }

  // Validate company type values
  const validTypes = ['ltd', 'plc', 'old-public-company', 'private-unlimited', 'private-unlimited-nsc', 'private-limited-guarant-nsc-limited-exemption', 'private-limited-guarant-nsc', 'private-limited-shares-section-30-exemption', 'llp', 'limited-partnership', 'scottish-partnership', 'charitable-incorporated-organisation', 'industrial-and-provident-society', 'registered-society-non-jurisdiction', 'unregistered-company', 'other', 'uk-establishment', 'scottish-charitable-incorporated-organisation', 'protected-cell-company', 'investment-company-with-variable-capital', 'investment-company-with-variable-capital-securities', 'investment-company-with-variable-capital-umbrella'];
  if (filters.company_type) {
    const invalidTypes = filters.company_type.filter(type => !validTypes.includes(type));
    if (invalidTypes.length > 0) {
      errors.push(`Invalid company_type values: ${invalidTypes.join(', ')}`);
    }
  }

  return errors;
};

const isValidDate = (dateString: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};