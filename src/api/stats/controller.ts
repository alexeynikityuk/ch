import { Request, Response, NextFunction } from 'express';
import pool from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export const getStatsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!pool) {
      throw new AppError('Database not available', 503);
    }

    // Get search counts for the last 30 days
    const query = `
      SELECT 
        date,
        search_count
      FROM search_metrics
      WHERE date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY date DESC
    `;

    const result = await pool.query(query);

    // Get summary stats
    const summaryQuery = `
      SELECT 
        SUM(search_count) as total_searches,
        (SELECT search_count FROM search_metrics WHERE date = CURRENT_DATE) as today_searches,
        (SELECT SUM(search_count) FROM search_metrics WHERE date >= CURRENT_DATE - INTERVAL '7 days') as week_searches
    `;

    const summaryResult = await pool.query(summaryQuery);
    const summary = summaryResult.rows[0];

    res.json({
      summary: {
        today: parseInt(summary.today_searches) || 0,
        last7Days: parseInt(summary.week_searches) || 0,
        total: parseInt(summary.total_searches) || 0
      },
      dailyStats: result.rows
    });
  } catch (error) {
    next(error);
  }
};