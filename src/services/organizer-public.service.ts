import { prisma } from '../config/prisma-client.config';
import { AppError } from '../utils/AppError';

interface GetOrganizerPublicEventsQuery {
  status?: string;
  page?: string;
  limit?: string;
}

export const organizerPublicService = {
  async getPublicProfile(username: string) {
    const user = await prisma.user.findFirst({
      where: {
        username,
        role: 'EO',
        deletedAt: null
      },
      include: {
        organizer: true
      }
    });

    if (!user || !user.organizer) {
      throw new AppError('Organizer not found', 404);
    }

    const { organizer } = user;

    // Aggregate stats across all events by this organizer
    const [eventCount, reviewAggregate] = await Promise.all([
      prisma.event.count({
        where: {
          organizerId: organizer.id,
          deletedAt: null,
          status: { in: ['published', 'completed'] }
        }
      }),
      prisma.eventReview.aggregate({
        where: {
          deletedAt: null,
          event: {
            organizerId: organizer.id,
            deletedAt: null
          }
        },
        _avg: { rating: true },
        _count: { rating: true }
      })
    ]);

    return {
      id: organizer.id,
      username: user.username,
      fullName: user.fullName,
      profilePictureUrl: user.profilePictureUrl,
      organizerName: organizer.organizerName,
      companyAddress: organizer.companyAddress,
      memberSince: user.createdAt,
      stats: {
        eventCount,
        averageRating: reviewAggregate._avg.rating
          ? Number(reviewAggregate._avg.rating)
          : 0,
        totalReviews: reviewAggregate._count.rating
      }
    };
  },

  async getPublicEvents(
    organizerId: string,
    query: GetOrganizerPublicEventsQuery
  ) {
    const { status, page = '1', limit = '9' } = query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(50, Number(limit)));

    const where: {
      organizerId: string;
      deletedAt: null;
      status?: { in: string[] } | string;
    } = {
      organizerId,
      deletedAt: null
    };

    if (status) {
      where.status = status;
    } else {
      // Default: show upcoming (published) and completed events
      where.status = { in: ['published', 'completed'] };
    }

    const [events, totalItems] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          category: true,
          city: { include: { province: true } },
          eventImages: true,
          ticketTypes: true
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { eventDate: 'desc' }
      }),
      prisma.event.count({ where })
    ]);

    return {
      events,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalItems / limitNum),
        totalItems,
        limit: limitNum
      }
    };
  }
};
