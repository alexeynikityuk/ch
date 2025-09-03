import { Router } from 'express';
import { exportController } from './controller';

const router = Router();

router.get('/', exportController);

export default router;