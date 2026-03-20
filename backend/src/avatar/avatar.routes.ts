import { Router } from 'express';
import { getAvatarToken } from './avatar.controller';

const router = Router();

router.post('/token', getAvatarToken);

export default router;
