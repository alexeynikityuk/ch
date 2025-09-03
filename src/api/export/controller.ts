import { Request, Response, NextFunction } from 'express';
import { parseAsync } from 'json2csv';
import pool from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { CompanyResult } from '../../types';

export const exportController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, format = 'csv' } = req.query;

    if (!token) {
      throw new AppError('Export token is required', 400);
    }

    if (!['csv', 'json'].includes(format as string)) {
      throw new AppError('Invalid format. Use csv or json', 400);
    }

    // Retrieve search results from database
    const query = `
      SELECT results FROM search_snapshots 
      WHERE id = $1 
      AND created_at > NOW() - INTERVAL '24 hours'
    `;

    const result = await pool.query(query, [token]);

    if (result.rows.length === 0) {
      throw new AppError('Export token not found or expired', 404);
    }

    const companies: CompanyResult[] = result.rows[0].results;

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="companies_export_${new Date().toISOString()}.json"`);
      res.json(companies);
    } else {
      // CSV export
      const fields = [
        { label: 'Company Name', value: 'company_name' },
        { label: 'Company Number', value: 'company_number' },
        { label: 'Status', value: 'status' },
        { label: 'Type', value: 'type' },
        { label: 'SIC Codes', value: (row: CompanyResult) => row.sic_codes?.join('; ') || '' },
        { label: 'Incorporation Date', value: 'incorporation_date' },
        { label: 'Locality', value: 'registered_office.locality' },
        { label: 'Postal Code', value: 'registered_office.postal_code' }
      ];

      const csv = await parseAsync(companies, { fields });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="companies_export_${new Date().toISOString()}.csv"`);
      res.send(csv);
    }
  } catch (error) {
    next(error);
  }
};