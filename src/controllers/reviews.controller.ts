import { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import { reviewService } from '../services/reviews.service';

export const reviewController = {
    create: catchAsync(async (req: Request, res: Response) => {
        const eventId = req.params.eventId as string;
        const { rating, reviewText } = req.body;

        const result = await reviewService.createReview(eventId, req.user!.id, {
            rating,
            reviewText
        });

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            data: result
        });
    }),

    getEventReviews: catchAsync(async (req: Request, res: Response) => {
        const eventId = req.params.eventId as string;

        const result = await reviewService.getEventReviews(eventId, req.query);

        res.status(200).json({
            success: true,
            message: 'Reviews retrieved successfully',
            data: result
        });
    }),

    getOrganizerReviews: catchAsync(async (req: Request, res: Response) => {
        const organizerId = req.params.organizerId as string;

        const result = await reviewService.getOrganizerReviews(
            organizerId,
            req.query
        );

        res.status(200).json({
            success: true,
            message: 'Organizer reviews retrieved successfully',
            data: result
        });
    })
};
