import { Router } from 'express';
import { getPresets, createPreset, deletePreset } from './controller';

const router = Router();

router.get('/', getPresets);
router.post('/', createPreset);
router.delete('/:id', deletePreset);

export default router;