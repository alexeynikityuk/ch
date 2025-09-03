export interface SICCodeMapping {
  code: string;
  description: string;
  keywords: string[];
}

// Common UK SIC codes with natural language mappings
export const sicCodeMappings: SICCodeMapping[] = [
  // Software & Technology
  { code: '62010', description: 'Computer programming activities', keywords: ['software', 'programming', 'coding', 'developer', 'app', 'application'] },
  { code: '62020', description: 'Computer consultancy activities', keywords: ['software', 'consulting', 'IT consulting', 'technology consulting'] },
  { code: '62090', description: 'Other information technology and computer service activities', keywords: ['IT', 'technology', 'tech support', 'IT services'] },
  { code: '63110', description: 'Data processing, hosting and related activities', keywords: ['data', 'hosting', 'cloud', 'server', 'data center'] },
  { code: '63120', description: 'Web portals', keywords: ['web', 'portal', 'website', 'online platform'] },
  
  // Finance & Banking
  { code: '64110', description: 'Central banking', keywords: ['bank', 'banking', 'central bank'] },
  { code: '64191', description: 'Banks', keywords: ['bank', 'banking', 'commercial bank'] },
  { code: '64205', description: 'Activities of financial services holding companies', keywords: ['finance', 'financial', 'holding', 'investment'] },
  { code: '64209', description: 'Other activities of holding companies', keywords: ['holding', 'investment', 'parent company'] },
  { code: '64301', description: 'Activities of investment trusts', keywords: ['investment', 'trust', 'fund'] },
  { code: '64302', description: 'Activities of unit trusts', keywords: ['investment', 'unit trust', 'fund'] },
  { code: '64303', description: 'Activities of venture and development capital companies', keywords: ['venture', 'VC', 'venture capital', 'startup funding'] },
  { code: '64910', description: 'Financial leasing', keywords: ['leasing', 'finance lease', 'asset finance'] },
  { code: '64921', description: 'Credit granting by non-deposit taking finance houses', keywords: ['credit', 'loan', 'lending', 'finance'] },
  { code: '64922', description: 'Activities of mortgage finance companies', keywords: ['mortgage', 'home loan', 'property finance'] },
  { code: '64929', description: 'Other credit granting', keywords: ['credit', 'loan', 'lending'] },
  { code: '64991', description: 'Security dealing on own account', keywords: ['trading', 'securities', 'stocks', 'bonds'] },
  { code: '64992', description: 'Factoring', keywords: ['factoring', 'invoice finance', 'receivables'] },
  { code: '64999', description: 'Other financial service activities', keywords: ['financial services', 'fintech', 'payment'] },
  
  // Insurance
  { code: '65110', description: 'Life insurance', keywords: ['insurance', 'life insurance', 'life cover'] },
  { code: '65120', description: 'Non-life insurance', keywords: ['insurance', 'general insurance', 'property insurance'] },
  { code: '65201', description: 'Life reinsurance', keywords: ['reinsurance', 'life reinsurance'] },
  { code: '65202', description: 'Non-life reinsurance', keywords: ['reinsurance', 'general reinsurance'] },
  
  // Real Estate
  { code: '68100', description: 'Buying and selling of own real estate', keywords: ['real estate', 'property', 'property development'] },
  { code: '68201', description: 'Renting and operating of Housing Association real estate', keywords: ['housing', 'rental', 'housing association'] },
  { code: '68202', description: 'Letting and operating of conference and exhibition centres', keywords: ['conference', 'exhibition', 'venue'] },
  { code: '68209', description: 'Other letting and operating of own or leased real estate', keywords: ['property', 'rental', 'landlord', 'letting'] },
  { code: '68310', description: 'Real estate agencies', keywords: ['estate agent', 'property agent', 'real estate agency'] },
  { code: '68320', description: 'Management of real estate on a fee or contract basis', keywords: ['property management', 'estate management'] },
  
  // Retail & E-commerce
  { code: '47110', description: 'Retail sale in non-specialised stores with food, beverages or tobacco predominating', keywords: ['retail', 'shop', 'store', 'supermarket', 'grocery'] },
  { code: '47910', description: 'Retail sale via mail order houses or via Internet', keywords: ['ecommerce', 'e-commerce', 'online retail', 'online shop', 'mail order'] },
  { code: '47990', description: 'Other retail sale not in stores, stalls or markets', keywords: ['retail', 'direct sales', 'home shopping'] },
  
  // Manufacturing
  { code: '10110', description: 'Processing and preserving of meat', keywords: ['manufacturing', 'meat', 'food processing'] },
  { code: '10200', description: 'Processing and preserving of fish, crustaceans and molluscs', keywords: ['manufacturing', 'fish', 'seafood', 'food processing'] },
  { code: '10710', description: 'Manufacture of bread; manufacture of fresh pastry goods and cakes', keywords: ['bakery', 'bread', 'manufacturing', 'food'] },
  { code: '26200', description: 'Manufacture of computers and peripheral equipment', keywords: ['manufacturing', 'computer', 'hardware', 'electronics'] },
  { code: '26400', description: 'Manufacture of consumer electronics', keywords: ['manufacturing', 'electronics', 'consumer electronics'] },
  
  // Professional Services
  { code: '69101', description: 'Barristers at law', keywords: ['legal', 'law', 'barrister', 'lawyer'] },
  { code: '69102', description: 'Solicitors', keywords: ['legal', 'law', 'solicitor', 'lawyer'] },
  { code: '69109', description: 'Activities of patent and copyright agents; other legal activities', keywords: ['legal', 'patent', 'copyright', 'intellectual property'] },
  { code: '69201', description: 'Accounting and auditing activities', keywords: ['accounting', 'accountant', 'audit', 'auditing'] },
  { code: '69202', description: 'Bookkeeping activities', keywords: ['bookkeeping', 'accounting', 'financial records'] },
  { code: '69203', description: 'Tax consultancy', keywords: ['tax', 'taxation', 'tax consultant', 'tax advisor'] },
  { code: '70100', description: 'Activities of head offices', keywords: ['management', 'head office', 'corporate', 'headquarters'] },
  { code: '70210', description: 'Public relations and communication activities', keywords: ['PR', 'public relations', 'communications', 'media relations'] },
  { code: '70221', description: 'Financial management', keywords: ['financial management', 'CFO services', 'finance director'] },
  { code: '70229', description: 'Management consultancy activities other than financial management', keywords: ['consulting', 'consultancy', 'management consulting', 'business consulting'] },
  
  // Marketing & Advertising
  { code: '73110', description: 'Advertising agencies', keywords: ['advertising', 'marketing', 'ad agency', 'creative agency'] },
  { code: '73120', description: 'Media representation', keywords: ['media', 'advertising sales', 'media planning'] },
  { code: '73200', description: 'Market research and public opinion polling', keywords: ['market research', 'research', 'polling', 'survey'] },
  
  // Healthcare
  { code: '86101', description: 'Hospital activities', keywords: ['hospital', 'healthcare', 'medical', 'health'] },
  { code: '86102', description: 'Medical nursing home activities', keywords: ['nursing home', 'care home', 'healthcare'] },
  { code: '86210', description: 'General medical practice activities', keywords: ['GP', 'doctor', 'medical practice', 'healthcare'] },
  { code: '86220', description: 'Specialist medical practice activities', keywords: ['specialist', 'medical', 'healthcare', 'consultant'] },
  { code: '86230', description: 'Dental practice activities', keywords: ['dental', 'dentist', 'dentistry', 'oral health'] },
  
  // Education
  { code: '85100', description: 'Pre-primary education', keywords: ['nursery', 'pre-school', 'early years', 'education'] },
  { code: '85200', description: 'Primary education', keywords: ['primary school', 'elementary', 'education'] },
  { code: '85310', description: 'General secondary education', keywords: ['secondary school', 'high school', 'education'] },
  { code: '85320', description: 'Technical and vocational secondary education', keywords: ['vocational', 'technical education', 'training'] },
  { code: '85410', description: 'Post-secondary non-tertiary education', keywords: ['further education', 'college', 'education'] },
  { code: '85421', description: 'First-degree level higher education', keywords: ['university', 'degree', 'higher education'] },
  { code: '85422', description: 'Post-graduate level higher education', keywords: ['postgraduate', 'masters', 'PhD', 'higher education'] },
  { code: '85590', description: 'Other education', keywords: ['training', 'courses', 'education', 'tutoring'] },
  
  // Construction
  { code: '41100', description: 'Development of building projects', keywords: ['construction', 'property development', 'building', 'developer'] },
  { code: '41201', description: 'Construction of commercial buildings', keywords: ['construction', 'commercial building', 'contractor'] },
  { code: '41202', description: 'Construction of domestic buildings', keywords: ['construction', 'house building', 'residential', 'contractor'] },
  { code: '43210', description: 'Electrical installation', keywords: ['electrical', 'electrician', 'wiring', 'installation'] },
  { code: '43220', description: 'Plumbing, heat and air-conditioning installation', keywords: ['plumbing', 'plumber', 'heating', 'HVAC'] },
  
  // Transportation & Logistics
  { code: '49100', description: 'Passenger rail transport, interurban', keywords: ['rail', 'train', 'railway', 'transport'] },
  { code: '49200', description: 'Freight rail transport', keywords: ['freight', 'rail freight', 'cargo', 'transport'] },
  { code: '49310', description: 'Urban and suburban passenger land transport', keywords: ['bus', 'public transport', 'metro', 'transport'] },
  { code: '49320', description: 'Taxi operation', keywords: ['taxi', 'cab', 'private hire', 'transport'] },
  { code: '49410', description: 'Freight transport by road', keywords: ['trucking', 'haulage', 'logistics', 'transport'] },
  { code: '49420', description: 'Removal services', keywords: ['removal', 'moving', 'relocation', 'transport'] },
  { code: '52100', description: 'Warehousing and storage', keywords: ['warehouse', 'storage', 'logistics', 'distribution'] },
  { code: '53100', description: 'Postal activities under universal service obligation', keywords: ['postal', 'mail', 'post office', 'delivery'] },
  { code: '53201', description: 'Licensed carriers', keywords: ['courier', 'parcel', 'delivery', 'logistics'] },
  { code: '53202', description: 'Unlicensed carriers', keywords: ['courier', 'delivery', 'last mile', 'logistics'] }
];

export function searchSICCodes(query: string): string[] {
  const normalizedQuery = query.toLowerCase().trim();
  const matchedCodes = new Set<string>();
  
  // Direct code match
  if (/^\d{4,5}$/.test(normalizedQuery)) {
    return [normalizedQuery];
  }
  
  // Search by keywords
  for (const mapping of sicCodeMappings) {
    // Check description
    if (mapping.description.toLowerCase().includes(normalizedQuery)) {
      matchedCodes.add(mapping.code);
      continue;
    }
    
    // Check keywords
    for (const keyword of mapping.keywords) {
      if (keyword.includes(normalizedQuery) || normalizedQuery.includes(keyword)) {
        matchedCodes.add(mapping.code);
        break;
      }
    }
  }
  
  return Array.from(matchedCodes);
}

export function getSICDescription(code: string): string {
  const mapping = sicCodeMappings.find(m => m.code === code);
  return mapping ? mapping.description : code;
}