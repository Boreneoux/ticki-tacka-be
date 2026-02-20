import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { verifyToken, roleGuard } from '../middlewares/auth.middleware';
import {
  getEventsValidator,
  getAttendeesValidator,
  getStatisticsValidator
} from '../validators/dashboard.validator';
import { expressRequestValidation } from '../middlewares/express-request-validation.middleware';

const dashboardRouter = Router();

dashboardRouter.use(verifyToken, roleGuard('EO'));

dashboardRouter.get(
  '/events',
  getEventsValidator,
  expressRequestValidation,
  dashboardController.getEvents
);

dashboardRouter.get(
  '/events/:eventId/attendees',
  getAttendeesValidator,
  expressRequestValidation,
  dashboardController.getAttendees
);

// GET /api/organizer/statistics
dashboardRouter.get(
  '/statistics',
  getStatisticsValidator,
  expressRequestValidation,
  dashboardController.getStatistics
);

// GET /api/organizer/events/:eventId/statistics
dashboardRouter.get(
  '/events/:eventId/statistics',
  getStatisticsValidator,
  expressRequestValidation,
  dashboardController.getEventStatistics
);

export default dashboardRouter;
