import { Router } from 'express';
import { searchController } from './controller';

const router = Router();

router.post('/', searchController);

export default router;