const sicCodeMappings = [
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
  { code: '64301', description: 'Activities of investment trusts', keywords: ['investment', 'trust', 'fund'] },
  { code: '64303', description: 'Activities of venture and development capital companies', keywords: ['venture', 'VC', 'venture capital', 'startup funding'] },
  { code: '64999', description: 'Other financial service activities', keywords: ['financial services', 'fintech', 'payment'] },
  
  // Retail & E-commerce
  { code: '47110', description: 'Retail sale in non-specialised stores', keywords: ['retail', 'shop', 'store', 'supermarket', 'grocery'] },
  { code: '47910', description: 'Retail sale via mail order houses or via Internet', keywords: ['ecommerce', 'e-commerce', 'online retail', 'online shop'] },
  
  // Professional Services
  { code: '69101', description: 'Barristers at law', keywords: ['legal', 'law', 'barrister', 'lawyer'] },
  { code: '69102', description: 'Solicitors', keywords: ['legal', 'law', 'solicitor', 'lawyer'] },
  { code: '69201', description: 'Accounting and auditing activities', keywords: ['accounting', 'accountant', 'audit', 'auditing'] },
  { code: '70229', description: 'Management consultancy activities', keywords: ['consulting', 'consultancy', 'management consulting', 'business consulting'] },
  
  // Marketing & Advertising
  { code: '73110', description: 'Advertising agencies', keywords: ['advertising', 'marketing', 'ad agency', 'creative agency'] },
  { code: '73200', description: 'Market research and public opinion polling', keywords: ['market research', 'research', 'polling', 'survey'] },
  
  // Healthcare
  { code: '86101', description: 'Hospital activities', keywords: ['hospital', 'healthcare', 'medical', 'health'] },
  { code: '86210', description: 'General medical practice activities', keywords: ['GP', 'doctor', 'medical practice', 'healthcare'] },
  { code: '86230', description: 'Dental practice activities', keywords: ['dental', 'dentist', 'dentistry', 'oral health'] },
  
  // Education
  { code: '85200', description: 'Primary education', keywords: ['primary school', 'elementary', 'education'] },
  { code: '85310', description: 'General secondary education', keywords: ['secondary school', 'high school', 'education'] },
  { code: '85421', description: 'First-degree level higher education', keywords: ['university', 'degree', 'higher education'] },
  
  // Real Estate
  { code: '68100', description: 'Buying and selling of own real estate', keywords: ['real estate', 'property', 'property development'] },
  { code: '68209', description: 'Other letting of own or leased real estate', keywords: ['property', 'rental', 'landlord', 'letting'] },
  { code: '68310', description: 'Real estate agencies', keywords: ['estate agent', 'property agent', 'real estate agency'] },
  
  // Construction
  { code: '41100', description: 'Development of building projects', keywords: ['construction', 'property development', 'building', 'developer'] },
  { code: '41201', description: 'Construction of commercial buildings', keywords: ['construction', 'commercial building', 'contractor'] },
  { code: '41202', description: 'Construction of domestic buildings', keywords: ['construction', 'house building', 'residential', 'contractor'] },
  
  // Transportation & Logistics
  { code: '49410', description: 'Freight transport by road', keywords: ['trucking', 'haulage', 'logistics', 'transport'] },
  { code: '52100', description: 'Warehousing and storage', keywords: ['warehouse', 'storage', 'logistics', 'distribution'] },
  { code: '53201', description: 'Licensed carriers', keywords: ['courier', 'parcel', 'delivery', 'logistics'] }
];

function searchSICCodes(query) {
  const normalizedQuery = query.toLowerCase().trim();
  const matches = [];
  
  // Direct code match
  if (/^\d{4,5}$/.test(normalizedQuery)) {
    return [{ code: normalizedQuery, description: `SIC Code ${normalizedQuery}` }];
  }
  
  // Search by keywords and description
  for (const mapping of sicCodeMappings) {
    let score = 0;
    
    // Check description
    if (mapping.description.toLowerCase().includes(normalizedQuery)) {
      score += 10;
    }
    
    // Check keywords
    for (const keyword of mapping.keywords) {
      if (keyword === normalizedQuery) {
        score += 20; // Exact match
      } else if (keyword.includes(normalizedQuery) || normalizedQuery.includes(keyword)) {
        score += 5; // Partial match
      }
    }
    
    if (score > 0) {
      matches.push({ ...mapping, score });
    }
  }
  
  // Sort by score and return top matches
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ score, ...rest }) => rest);
}