import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { verifyToken, roleGuard } from '../middlewares/auth.middleware';

const dashboardRouter = Router();

dashboardRouter.use(verifyToken, roleGuard('EO'));

dashboardRouter.get('/events', dashboardController.getEvents);

dashboardRouter.get(
  '/events/:eventId/attendees',
  dashboardController.getAttendees
);

// GET /api/organizer/statistics
dashboardRouter.get('/statistics', dashboardController.getStatistics);

// GET /api/organizer/events/:eventId/statistics
dashboardRouter.get(
  '/events/:eventId/statistics',
  dashboardController.getEventStatistics
);

export default dashboardRouter;
