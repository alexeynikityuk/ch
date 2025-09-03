# techspec.md — Companies House Filter & Export Web App

## 1) Goal
A lightweight web app that lets a user define filters (as supported by Companies House), preview matching UK companies in a table, and export results to CSV/JSON.

- **Data source:** Companies House REST API  
  Base: `https://api.companieshouse.gov.uk/`  
  Docs: `https://developer.company-information.service.gov.uk/`

---

## 2) Core user stories (MVP)
1. As a user, I can enter filter criteria (e.g., company status, incorporation date range, SIC codes, postcode, company type) and run a search.
2. I can see a paginated table preview of matched companies (name, number, status, type, SIC, registered office locality/postcode, incorporation date).
3. I can export the current result set to **CSV** or **JSON**.
4. I can save a filter preset and re-run it later.

---

## 3) High-level architecture
- **Frontend:** Next.js (App Router) + React + Tailwind.  
- **Backend:** Next.js API routes (Node 18+).  
- **Queue/Jobs (optional for large exports):** BullMQ + Redis.  
- **DB:** Postgres (e.g., Supabase/Neon).  
- **Auth:** Email link or OAuth (Clerk/Auth.js).  
- **Secrets:** ENV vars (Vercel/Render).  
- **Observability:** simple request logs + metrics.

---

## 4) External API usage
- **Auth:** Companies House uses HTTP Basic where **API key** is the username and password is blank.  
- **Endpoints (minimum needed):**
  - **Search companies** (keyword + paging) to discover candidates.
  - **Company profile** for enrichment by company number.
  - (Optional) **Advanced/filtered search support** if available in API; otherwise emulate via combinations of search + per-company filters (status/type) and/or metadata fields.
- **Rate limiting:** Respect published limits; add throttle (token bucket) and backoff/retry (HTTP 429/5xx).
- **Caching:** 10–60 min cache on search pages; per-company profile cached 24h with ETag/If-None-Match when provided.

---

## 5) Filtering model
Expose only filters that map directly/safely to Companies House parameters or reliably derivable fields:

- **Company status** (e.g., active/dissolved).  
- **Company type** (e.g., ltd, plc, llp).  
- **Incorporation date** (from /company profile; filter client/server side).  
- **SIC codes** (exact or starts-with).  
- **Registered office** locality or **postcode** (prefix match).  
- **Name keyword** (free text).

> Note: Exact available filters depend on Companies House endpoints. Where the API doesn’t support server-side filtering, we fetch result pages and apply **server-side filtering** before display/export (with clear note to user about partial/complete coverage).

---

## 6) Data flow
1. **User enters filters** → `/api/search` request.
2. **Backend**:
   - Builds Companies House query (or sequence of queries + pagination).
   - Throttles requests; caches responses.
   - Enriches with `/company/{number}` if needed for fields (e.g., SIC/incorporation date).
   - Applies server-side filters.
   - Returns a **paged** result set and a **result_token** for export.
3. **Frontend** renders table with client pagination controls (talking to server).
4. **Export**:
   - `/api/export?token=…&format=csv|json`
   - If the result requires many upstream calls, enqueue a job; stream results when ready (immediate for small sets).

---

## 7) API (our backend)
### `POST /api/search`
- **Body:**  
  ```json
  {
    "filters": {
      "keyword": "fintech",
      "company_status": ["active"],
      "company_type": ["ltd"],
      "sic": ["64205","64"],
      "incorporated_from": "2018-01-01",
      "incorporated_to": "2025-09-03",
      "postcode_prefix": "EC2",
      "locality": "London"
    },
    "page": 1,
    "page_size": 50
  }
  ```
- **Response:**  
  ```json
  {
    "items": [{
      "company_name": "ACME LTD",
      "company_number": "12345678",
      "status": "active",
      "type": "ltd",
      "sic_codes": ["62020"],
      "incorporation_date": "2020-05-01",
      "registered_office": {"locality":"London","postal_code":"EC2A 1AA"}
    }],
    "page": 1,
    "total_estimated": 1234,
    "result_token": "abc123"
  }
  ```

### `GET /api/export`
- **Query:** `token`, `format=csv|json`
- **Response:** file stream (Content-Disposition). If long-running, responds with `202` + `job_id`; client polls `/api/export/:job_id` for completion and then downloads.

### `GET /api/presets` / `POST /api/presets`
- Save/load named filter presets per user.

---

## 8) DB schema (minimal)
```sql
-- saved filter presets
create table filter_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  filters jsonb not null,
  created_at timestamptz default now()
);

-- cached search snapshots for export
create table search_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  filters jsonb not null,
  created_at timestamptz default now(),
  -- optionally store normalized results for deterministic exports:
  results jsonb
);

-- (optional) normalized companies for deeper analytics
create table companies (
  company_number text primary key,
  company_name text,
  status text,
  type text,
  sic_codes text[],
  incorporation_date date,
  locality text,
  postal_code text,
  last_refreshed timestamptz
);
```

---

## 9) UI spec (MVP)
- **Filters sidebar/panel**:
  - Keyword (text)
  - Status (multi-select)
  - Type (multi-select)
  - SIC codes (multi-select with typeahead)
  - Incorporation date range (date pickers)
  - Locality / Postcode prefix (text)
  - Buttons: **Apply**, **Save preset**, **Reset**
- **Results table**:
  - Columns: Name (link to CH profile), Number, Status, Type, SIC(s), Incorporation Date, Locality, Postcode
  - Paging controls; **Export CSV/JSON** button
- **Preset dropdown** to load saved filters.

---

## 10) Error handling & limits
- **Upstream errors**: surface human-readable message; retry on 429 with exponential backoff.
- **Partial results**: if filter requires enrichment per company (profile fetch) and rate limit would be exceeded, show partial page quickly and continue background fetch; display a banner “Completing enrichment…”.
- **Validation**: client + server validate filter shapes, dates, and known enum values.

---

## 11) Security & compliance
- Store **Companies House API key** in server-side env only (`CH_API_KEY`).
- All requests to CH from server (never from browser).
- PII: only public company data; no special data handling beyond standard security.
- Logging excludes secrets; redact request headers.

---

## 12) Performance
- **Throttling** to conform with CH limits.
- **Caching**:
  - Search responses (by query hash) 10–60 min in Redis.
  - Company profiles 24h in Redis/DB with ETag support when available.
- **Batching**: fetch profiles in small concurrent batches (e.g., 3–5 at a time).

---

## 13) Testing
- **Unit**: filter mapping, CSV/JSON serialization, throttling logic.
- **Integration**: mocked Companies House API via recorded fixtures.
- **E2E**: Cypress flows for search → preview → export.

---

## 14) Deployment
- **Platform:** Vercel (frontend + API) or Render/Fly (API) + Vercel (frontend).
- **Env vars:** `CH_API_KEY`, `DATABASE_URL`, `REDIS_URL`.
- **Cron (optional):** nightly refresh for any pinned company lists/presets.

---

## 15) Nice-to-haves (post-MVP)
- Export to Google Sheets.
- Webhooks/email when long exports finish.
- More filters (officers, dissolution date, charges) if/when supported.
- Simple charts (companies by year/SIC).
- Multi-tenant orgs & roles.

