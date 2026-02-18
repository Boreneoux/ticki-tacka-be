import { prisma } from '../config/prisma-client.config';
import { AppError } from '../utils/AppError';

interface CreateReviewInput {
    rating: number;
    reviewText?: string;
}

interface GetReviewsQuery {
    page?: string;
    limit?: string;
}

export const reviewService = {
    async createReview(
        eventId: string,
        userId: string,
        data: CreateReviewInput
    ) {

        const event = await prisma.event.findUnique({
            where: { id: eventId }
        });

        if (!event || event.deletedAt) {
            throw new AppError('Event not found', 404);
        }


        if (new Date(event.eventDate) >= new Date()) {
            throw new AppError(
                'You can only review an event after it has taken place',
                400
            );
        }


        const completedTransaction = await prisma.transaction.findFirst({
            where: {
                userId,
                eventId,
                paymentStatus: 'done',
                deletedAt: null
            }
        });

        if (!completedTransaction) {
            throw new AppError(
                'You can only review events you have attended (transaction must be completed)',
                403
            );
        }


        if (data.rating < 1 || data.rating > 5) {
            throw new AppError('Rating must be between 1 and 5', 400);
        }


        const existingReview = await prisma.eventReview.findUnique({
            where: {
                eventId_userId: { eventId, userId }
            }
        });

        if (existingReview) {
            throw new AppError('You have already reviewed this event', 409);
        }


        const review = await prisma.eventReview.create({
            data: {
                eventId,
                userId,
                rating: data.rating,
                reviewText: data.reviewText || null
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        profilePictureUrl: true
                    }
                }
            }
        });

        return review;
    },

    async getEventReviews(eventId: string, query: GetReviewsQuery) {
        const { page = '1', limit = '10' } = query;


        const event = await prisma.event.findUnique({
            where: { id: eventId }
        });

        if (!event || event.deletedAt) {
            throw new AppError('Event not found', 404);
        }

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [reviews, total] = await Promise.all([
            prisma.eventReview.findMany({
                where: { eventId, deletedAt: null },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            fullName: true,
                            profilePictureUrl: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take
            }),
            prisma.eventReview.count({
                where: { eventId, deletedAt: null }
            })
        ]);


        const aggregate = await prisma.eventReview.aggregate({
            where: { eventId, deletedAt: null },
            _avg: { rating: true },
            _count: { rating: true }
        });

        return {
            reviews,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / take)
            },
            summary: {
                averageRating: aggregate._avg.rating
                    ? Number(aggregate._avg.rating)
                    : 0,
                totalReviews: aggregate._count.rating
            }
        };
    },

    async getOrganizerReviews(organizerId: string, query: GetReviewsQuery) {
        const { page = '1', limit = '10' } = query;


        const organizer = await prisma.organizer.findUnique({
            where: { id: organizerId }
        });

        if (!organizer || organizer.deletedAt) {
            throw new AppError('Organizer not found', 404);
        }

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);


        const whereClause = {
            deletedAt: null,
            event: {
                organizerId,
                deletedAt: null
            }
        };

        const [reviews, total] = await Promise.all([
            prisma.eventReview.findMany({
                where: whereClause,
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            fullName: true,
                            profilePictureUrl: true
                        }
                    },
                    event: {
                        select: {
                            id: true,
                            name: true,
                            slug: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take
            }),
            prisma.eventReview.count({
                where: whereClause
            })
        ]);


        const aggregate = await prisma.eventReview.aggregate({
            where: whereClause,
            _avg: { rating: true },
            _count: { rating: true }
        });

        return {
            reviews,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / take)
            },
            summary: {
                averageRating: aggregate._avg.rating
                    ? Number(aggregate._avg.rating)
                    : 0,
                totalReviews: aggregate._count.rating
            }
        };
    }
};
