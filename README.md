# Companies House Filter & Export API

A Node.js backend API that allows users to search UK companies using Companies House data, apply filters, and export results.

## Features

- Search companies by keyword and various filters
- Filter by company status, type, SIC codes, incorporation date, location
- Export search results to CSV or JSON
- Save and manage filter presets
- Redis caching for improved performance
- Rate limiting and error handling

## Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- Companies House API key

## Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up PostgreSQL database:
```bash
psql -U your_username -d postgres
CREATE DATABASE companies_house_app;
\q
psql -U your_username -d companies_house_app < database/init.sql
```

4. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

5. Update `.env` with your credentials:
- `CH_API_KEY`: Your Companies House API key
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string

6. Run the development server:
```bash
npm run dev
```

## API Endpoints

### Search Companies
```
POST /api/search
Content-Type: application/json

{
  "filters": {
    "keyword": "fintech",
    "company_status": ["active"],
    "company_type": ["ltd"],
    "sic": ["64205"],
    "incorporated_from": "2018-01-01",
    "incorporated_to": "2025-09-03",
    "postcode_prefix": "EC2",
    "locality": "London"
  },
  "page": 1,
  "page_size": 50
}
```

### Export Results
```
GET /api/export?token=<result_token>&format=csv
GET /api/export?token=<result_token>&format=json
```

### Filter Presets
```
GET /api/presets
POST /api/presets
DELETE /api/presets/:id
```

### Health Check
```
GET /health
```

## Project Structure

```
src/
├── api/
│   ├── search/
│   ├── export/
│   └── presets/
├── config/
│   ├── database.ts
│   └── redis.ts
├── middleware/
│   └── errorHandler.ts
├── services/
│   └── companiesHouseApi.ts
├── types/
│   └── index.ts
└── index.ts
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server

## Rate Limiting

The API respects Companies House rate limits and implements:
- Request queuing and throttling
- Automatic retry with exponential backoff for 429 errors
- Redis caching to minimize API calls

## Error Handling

All errors are handled consistently with appropriate HTTP status codes and error messages.

## Security

- Companies House API key is stored server-side only
- All external API calls are made from the server
- Input validation on all endpoints
- SQL injection protection via parameterized queries