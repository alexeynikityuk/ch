import { Router } from 'express';
import { healthController } from './controller';

const router = Router();

router.get('/', healthController);

export default router;