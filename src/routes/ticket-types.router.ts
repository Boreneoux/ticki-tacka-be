import { Router } from 'express';
import { ticketTypeController } from '../controllers/ticket-types.controller';
import { verifyToken, roleGuard } from '../middlewares/auth.middleware';
import {
  createTicketTypeValidator,
  updateTicketTypeValidator
} from '../validators/ticket-type.validator';
import { expressRequestValidation } from '../middlewares/express-request-validation.middleware';

const ticketTypeRouter = Router({ mergeParams: true });

/**
 * PUBLIC ROUTES
 * Base path: /api/events/:eventId/ticket-types
 */
ticketTypeRouter.get('/', ticketTypeController.getByEvent);

/**
 * ORGANIZER ROUTES (EO)
 */
ticketTypeRouter.post(
  '/',
  verifyToken,
  roleGuard('EO'),
  createTicketTypeValidator,
  expressRequestValidation,
  ticketTypeController.create
);

ticketTypeRouter.put(
  '/:ticketTypeId',
  verifyToken,
  roleGuard('EO'),
  updateTicketTypeValidator,
  expressRequestValidation,
  ticketTypeController.update
);

ticketTypeRouter.delete(
  '/:ticketTypeId',
  verifyToken,
  roleGuard('EO'),
  ticketTypeController.remove
);

export default ticketTypeRouter;
