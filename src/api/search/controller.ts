import { Request, Response, NextFunction } from 'express';
import { SearchRequest, SearchResponse } from '../../types';
import companiesHouseApi from '../../services/companiesHouseApi';
import { AppError } from '../../middleware/errorHandler';
import { validateSearchFilters } from '../../utils/validation';
import crypto from 'crypto';
import pool from '../../config/database';

export const searchController = async (
  req: Request<{}, {}, SearchRequest>,
  res: Response<SearchResponse>,
  next: NextFunction
) => {
  try {
    const { filters, page = 1, page_size = 50 } = req.body;

    // Validate request
    if (!filters) {
      throw new AppError('Filters are required', 400);
    }

    if (page < 1 || page_size < 1 || page_size > 100) {
      throw new AppError('Invalid pagination parameters', 400);
    }

    // Validate filters
    const validationErrors = validateSearchFilters(filters);
    if (validationErrors.length > 0) {
      throw new AppError(`Validation errors: ${validationErrors.join(', ')}`, 400);
    }

    // Search companies with filters
    const searchResult = await companiesHouseApi.searchWithFilters(filters, page, page_size);

    // Track search in metrics
    if (pool) {
      try {
        await pool.query(`
          INSERT INTO search_metrics (date, search_count) 
          VALUES (CURRENT_DATE, 1)
          ON CONFLICT (date) 
          DO UPDATE SET search_count = search_metrics.search_count + 1
        `);
      } catch (metricsError) {
        console.warn('Failed to update search metrics:', metricsError);
        // Continue without tracking - don't fail the search
      }
    }

    // Generate result token for export
    const resultToken = crypto.randomBytes(16).toString('hex');

    // Store search snapshot for export
    const query = `
      INSERT INTO search_snapshots (id, user_id, filters, results, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `;
    
    // For MVP, using a placeholder user_id
    const userId = '00000000-0000-0000-0000-000000000000';
    
    // Only store in database if pool is available
    if (pool) {
      try {
        await pool.query(query, [
          resultToken,
          userId,
          JSON.stringify(filters),
          JSON.stringify(searchResult.items)
        ]);
      } catch (dbError) {
        console.warn('Failed to store search snapshot in database:', dbError);
        // Continue without storing - export won't work but search will
      }
    }

    const response: SearchResponse = {
      items: searchResult.items,
      page,
      total_estimated: searchResult.total,
      result_token: resultToken
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const searchStreamController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Parse query parameters
    const filtersParam = req.query.filters as string;
    const pageParam = parseInt(req.query.page as string) || 1;
    const pageSizeParam = parseInt(req.query.page_size as string) || 50;

    if (!filtersParam) {
      throw new AppError('Filters are required', 400);
    }

    const filters = JSON.parse(filtersParam);
    
    // Validate filters
    const validationErrors = validateSearchFilters(filters);
    if (validationErrors.length > 0) {
      throw new AppError(`Validation errors: ${validationErrors.join(', ')}`, 400);
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable Nginx buffering
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    if (res.flush) res.flush();
    
    // Send progress updates
    const progressCallback = (current: number, total: number) => {
      res.write(`data: ${JSON.stringify({ type: 'progress', current, total })}\n\n`);
      // Force flush to ensure client receives the update
      if (res.flush) res.flush();
    };

    try {
      // Search companies with progress tracking
      const searchResult = await companiesHouseApi.searchWithFilters(
        filters, 
        pageParam, 
        pageSizeParam,
        progressCallback
      );

      // Generate result token
      const resultToken = crypto.randomBytes(16).toString('hex');

      // Increment daily search counter
      if (pool) {
        try {
          const today = new Date().toISOString().split('T')[0];
          const metricsQuery = `
            INSERT INTO search_metrics (date, search_count, unique_filters)
            VALUES ($1, 1, $2)
            ON CONFLICT (date) DO UPDATE 
            SET search_count = search_metrics.search_count + 1,
                unique_filters = CASE 
                  WHEN NOT search_metrics.unique_filters @> $2
                  THEN search_metrics.unique_filters || $2
                  ELSE search_metrics.unique_filters
                END,
                updated_at = NOW()
          `;
          await pool.query(metricsQuery, [today, JSON.stringify([filters])]);
        } catch (metricsError) {
          console.warn('Failed to update search metrics:', metricsError);
        }
      }

      // Store search snapshot for export
      if (pool) {
        try {
          const query = `
            INSERT INTO search_snapshots (id, user_id, filters, results, created_at)
            VALUES ($1, $2, $3, $4, NOW())
          `;
          const userId = '00000000-0000-0000-0000-000000000000';
          await pool.query(query, [
            resultToken,
            userId,
            JSON.stringify(filters),
            JSON.stringify(searchResult.items)
          ]);
        } catch (dbError) {
          console.warn('Failed to store search snapshot in database:', dbError);
        }
      }

      // Send final result
      const response: SearchResponse = {
        items: searchResult.items,
        page: pageParam,
        total_estimated: searchResult.total,
        result_token: resultToken
      };

      res.write(`data: ${JSON.stringify({ type: 'result', result: response })}\n\n`);
      res.end();
    } catch (error: any) {
      // Send error
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  } catch (error) {
    next(error);
  }
};