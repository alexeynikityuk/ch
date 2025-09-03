import { Router } from 'express';
import { searchController, searchStreamController } from './controller';

const router = Router();

router.post('/', searchController);
router.get('/stream', searchStreamController);

export default router;