import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { rateLimitMiddleware } from './middleware/rateLimiter';
import searchRoutes from './api/search/routes';
import exportRoutes from './api/export/routes';
import presetsRoutes from './api/presets/routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware for Vercel
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${req.ip}, x-forwarded-for: ${req.headers['x-forwarded-for']}`);
  next();
});

// Serve static files without rate limiting
app.use(express.static(path.join(__dirname, '../public')));

// Apply rate limiting only to API routes
// Temporarily disabled to debug Vercel issue
// app.use('/api', rateLimitMiddleware);

app.use('/api/search', searchRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/presets', presetsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

// For local development
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export for Vercel
export default app;