# Companies House API Documentation

Base URL: `http://localhost:3000/api`

## Authentication

Currently, the API does not require authentication for MVP. Future versions will implement JWT-based authentication.

## Rate Limiting

All endpoints are rate-limited to:
- 100 requests per minute per IP address
- Headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Endpoints

### 1. Search Companies

Search for UK companies with various filters.

**Endpoint:** `POST /api/search`

**Request Body:**
```json
{
  "filters": {
    "keyword": "string (required)",
    "company_status": ["active", "dissolved", "liquidation"],
    "company_type": ["ltd", "plc", "llp"],
    "sic": ["64205", "64"],
    "incorporated_from": "2018-01-01",
    "incorporated_to": "2025-09-03",
    "postcode_prefix": "EC2",
    "locality": "London"
  },
  "page": 1,
  "page_size": 50
}
```

**Response:**
```json
{
  "items": [
    {
      "company_name": "ACME LTD",
      "company_number": "12345678",
      "status": "active",
      "type": "ltd",
      "sic_codes": ["62020"],
      "incorporation_date": "2020-05-01",
      "registered_office": {
        "locality": "London",
        "postal_code": "EC2A 1AA"
      }
    }
  ],
  "page": 1,
  "total_estimated": 1234,
  "result_token": "abc123"
}
```

**Filter Options:**

- **company_status**: `active`, `dissolved`, `liquidation`, `receivership`, `converted-closed`, `voluntary-arrangement`, `insolvency-proceedings`, `administration`
- **company_type**: `ltd`, `plc`, `llp`, `private-unlimited`, `private-limited-guarant-nsc`, etc.

### 2. Export Results

Export search results to CSV or JSON format.

**Endpoint:** `GET /api/export`

**Query Parameters:**
- `token` (required): Result token from search response
- `format` (optional): `csv` or `json` (default: `csv`)

**Response:**
- CSV: Returns CSV file with appropriate headers
- JSON: Returns JSON array of company data

**Example:**
```
GET /api/export?token=abc123&format=csv
```

### 3. Filter Presets

Save and manage search filter presets.

#### Get All Presets

**Endpoint:** `GET /api/presets`

**Response:**
```json
{
  "presets": [
    {
      "id": "uuid",
      "name": "London Tech Companies",
      "filters": {
        "keyword": "technology",
        "locality": "London",
        "company_status": ["active"]
      },
      "created_at": "2025-09-03T12:00:00Z"
    }
  ]
}
```

#### Create Preset

**Endpoint:** `POST /api/presets`

**Request Body:**
```json
{
  "name": "London Tech Companies",
  "filters": {
    "keyword": "technology",
    "locality": "London",
    "company_status": ["active"]
  }
}
```

**Response:**
```json
{
  "preset": {
    "id": "uuid",
    "name": "London Tech Companies",
    "filters": {...},
    "created_at": "2025-09-03T12:00:00Z"
  }
}
```

#### Delete Preset

**Endpoint:** `DELETE /api/presets/:id`

**Response:** 204 No Content

### 4. Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-09-03T12:00:00.000Z"
}
```

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "message": "Error description",
    "statusCode": 400,
    "timestamp": "2025-09-03T12:00:00.000Z"
  }
}
```

**Common Status Codes:**
- `400`: Bad Request (validation errors)
- `404`: Not Found
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

## Data Validation

### Date Format
All dates must be in ISO 8601 format: `YYYY-MM-DD`

### Pagination
- `page`: Minimum 1
- `page_size`: Minimum 1, Maximum 100

## Caching

- Search results are cached for 10 minutes
- Company profiles are cached for 24 hours
- Export tokens are valid for 24 hours

## Known Limitations

1. Companies House API requires a keyword for search - cannot search by filters alone
2. Some filters require fetching individual company profiles, which may be slower
3. Rate limits are shared across all endpoints