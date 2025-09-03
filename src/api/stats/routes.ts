import { Router } from 'express';
import { getStatsController } from './controller';

const router = Router();

router.get('/', getStatsController);

export default router;