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

    // Generate result token for export
    const resultToken = crypto.randomBytes(16).toString('hex');

    // Store search snapshot for export
    const query = `
      INSERT INTO search_snapshots (id, user_id, filters, results, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `;
    
    // For MVP, using a placeholder user_id
    const userId = '00000000-0000-0000-0000-000000000000';
    
    await pool.query(query, [
      resultToken,
      userId,
      JSON.stringify(filters),
      JSON.stringify(searchResult.items)
    ]);

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