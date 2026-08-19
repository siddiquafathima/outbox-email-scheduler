import { Router } from 'express';
import { createCampaign, getEmails, getEmailById } from '../controllers/campaignController';

const router = Router();

router.post('/campaigns', createCampaign);
router.get('/emails', getEmails);
router.get('/emails/:id', getEmailById);
export default router;