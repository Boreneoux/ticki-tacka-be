import { Router } from 'express';
import { query } from 'express-validator';
import { expressRequestValidation } from '../middlewares/express-request-validation.middleware';
import { organizerPublicController } from '../controllers/organizer-public.controller';

const organizerPublicRouter = Router();

/**
 * GET /api/organizers/public/:username
 * Get public organizer profile by username (no auth required)
 */
organizerPublicRouter.get(
  '/public/:username',
  organizerPublicController.getProfile
);

/**
 * GET /api/organizers/:organizerId/events
 * Get public events for an organizer (no auth required)
 */
organizerPublicRouter.get(
  '/:organizerId/events',
  [
    query('status').optional().isString(),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  expressRequestValidation,
  organizerPublicController.getEvents
);

export default organizerPublicRouter;
