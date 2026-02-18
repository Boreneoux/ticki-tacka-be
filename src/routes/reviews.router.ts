import { Router } from 'express';
import { reviewController } from '../controllers/reviews.controller';
import { verifyToken, roleGuard } from '../middlewares/auth.middleware';

const reviewRouter = Router({ mergeParams: true });


reviewRouter.get('/', reviewController.getEventReviews);

reviewRouter.post(
    '/',
    verifyToken,
    roleGuard('User'),
    reviewController.create
);


const organizerReviewRouter = Router({ mergeParams: true });

organizerReviewRouter.get('/', reviewController.getOrganizerReviews);

export { organizerReviewRouter };
export default reviewRouter;
