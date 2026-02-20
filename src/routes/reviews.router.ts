import { Router } from 'express';
import { reviewController } from '../controllers/reviews.controller';
import { verifyToken, roleGuard } from '../middlewares/auth.middleware';
import {
  createReviewValidator,
  getReviewsValidator
} from '../validators/review.validator';
import { expressRequestValidation } from '../middlewares/express-request-validation.middleware';

const reviewRouter = Router({ mergeParams: true });

reviewRouter.get(
  '/',
  getReviewsValidator,
  expressRequestValidation,
  reviewController.getEventReviews
);

reviewRouter.post(
  '/',
  verifyToken,
  roleGuard('User'),
  createReviewValidator,
  expressRequestValidation,
  reviewController.create
);

const organizerReviewRouter = Router({ mergeParams: true });

organizerReviewRouter.get(
  '/',
  getReviewsValidator,
  expressRequestValidation,
  reviewController.getOrganizerReviews
);

export { organizerReviewRouter };
export default reviewRouter;
