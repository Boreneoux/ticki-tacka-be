import { Router } from 'express';
import { ticketTypeController } from '../controllers/ticket-types.controller';
import { verifyToken, roleGuard } from '../middlewares/auth.middleware';

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
    ticketTypeController.create
);

ticketTypeRouter.put(
    '/:ticketTypeId',
    verifyToken,
    roleGuard('EO'),
    ticketTypeController.update
);

ticketTypeRouter.delete(
    '/:ticketTypeId',
    verifyToken,
    roleGuard('EO'),
    ticketTypeController.remove
);

export default ticketTypeRouter;
