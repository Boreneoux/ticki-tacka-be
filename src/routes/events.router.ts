import { Router } from 'express';
import { eventController } from '../controllers/events.controller';
import { verifyToken, roleGuard } from '../middlewares/auth.middleware';
import { multerUpload } from '../helpers/multer.helper';
import {
  createEventValidator,
  updateEventValidator,
  getAllEventsValidator,
  createVoucherValidator
} from '../validators/event.validator';
import { expressRequestValidation } from '../middlewares/express-request-validation.middleware';
import ticketTypeRouter from './ticket-types.router';

const eventRouter = Router();

/**
 * PUBLIC ROUTES
 */
eventRouter.get(
  '/',
  getAllEventsValidator,
  expressRequestValidation,
  eventController.getAll
);

eventRouter.get('/:slug', eventController.getDetail);

/**
 * ORGANIZER ROUTES (EO)
 */
eventRouter.post(
  '/',
  verifyToken,
  roleGuard('EO'),
  multerUpload('', 'IMG-EVENT').array('images', 3),
  createEventValidator,
  expressRequestValidation,
  eventController.create
);

eventRouter.put(
  '/:id',
  verifyToken,
  roleGuard('EO'),
  multerUpload('', 'IMG-EVENT').array('images', 3),
  updateEventValidator,
  expressRequestValidation,
  eventController.update
);

eventRouter.delete(
  '/:id',
  verifyToken,
  roleGuard('EO'),
  eventController.remove
);

eventRouter.post(
  '/:eventId/vouchers',
  verifyToken,
  roleGuard('EO'),
  createVoucherValidator,
  expressRequestValidation,
  eventController.createVoucher
);

eventRouter.patch(
  '/:id/publish',
  verifyToken,
  roleGuard('EO'),
  eventController.publish
);

eventRouter.patch(
  '/:id/cancel',
  verifyToken,
  roleGuard('EO'),
  eventController.cancel
);

/**
 * TICKET TYPES SUB-ROUTES
 */
eventRouter.use('/:eventId/ticket-types', ticketTypeRouter);

export default eventRouter;
