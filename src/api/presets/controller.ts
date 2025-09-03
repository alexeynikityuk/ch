import { Request, Response, NextFunction } from 'express';
import pool from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { CompanySearchFilters, FilterPreset } from '../../types';

// For MVP, using a placeholder user_id
const TEMP_USER_ID = '00000000-0000-0000-0000-000000000000';

export const getPresets = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!pool) {
      res.json({ presets: [] });
      return;
    }

    const query = `
      SELECT id, name, filters, created_at
      FROM filter_presets
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [TEMP_USER_ID]);

    const presets = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      filters: row.filters,
      created_at: row.created_at
    }));

    res.json({ presets });
  } catch (error) {
    next(error);
  }
};

export const createPreset = async (
  req: Request<{}, {}, { name: string; filters: CompanySearchFilters }>,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!pool) {
      throw new AppError('Presets functionality is currently unavailable', 503);
    }

    const { name, filters } = req.body;

    if (!name || !filters) {
      throw new AppError('Name and filters are required', 400);
    }

    const query = `
      INSERT INTO filter_presets (user_id, name, filters, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, name, filters, created_at
    `;

    const result = await pool.query(query, [
      TEMP_USER_ID,
      name,
      JSON.stringify(filters)
    ]);

    const preset = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      filters: result.rows[0].filters,
      created_at: result.rows[0].created_at
    };

    res.status(201).json({ preset });
  } catch (error) {
    next(error);
  }
};

export const deletePreset = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!pool) {
      throw new AppError('Presets functionality is currently unavailable', 503);
    }

    const { id } = req.params;

    const query = `
      DELETE FROM filter_presets
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await pool.query(query, [id, TEMP_USER_ID]);

    if (result.rowCount === 0) {
      throw new AppError('Preset not found', 404);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};