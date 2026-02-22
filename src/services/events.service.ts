import { prisma } from '../config/prisma-client.config';
import { AppError } from '../utils/AppError';
import { generateUniqueSlug } from '../utils/slug';
import {
  buildCloudinaryFolder,
  cloudinaryUpload,
  cloudinaryDelete
} from '../helpers/cloudinary.helper';
import { PrismaClient } from '../generated/prisma/client';

type TransactionClient = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0];

interface CreateEventInput {
  name: string;
  categoryId: string;
  eventDate: Date;
  eventTime: Date;
  endDate?: Date;
  endTime?: Date;
  cityId: string;
  venueName: string;
  venueAddress: string;
  description: string;
}

interface TicketTypeInput {
  name: string;
  description?: string;
  price: number;
  quota: number;
}

interface UpdateEventInput {
  name?: string;
  categoryId?: string;
  eventDate?: Date;
  eventTime?: Date;
  endDate?: Date;
  endTime?: Date;
  cityId?: string;
  venueName?: string;
  venueAddress?: string;
  description?: string;
}

interface GetAllEventsQuery {
  search?: string;
  category?: string;
  city?: string;
  page?: string;
  limit?: string;
}

export const eventService = {
  async createEvent(
    userId: string,
    data: CreateEventInput,
    ticketTypes: TicketTypeInput[],
    files: Express.Multer.File[]
  ) {
    if (!data.name) {
      throw new AppError('Event name is required', 400);
    }

    // Validate ticket types
    if (!ticketTypes || !ticketTypes.length) {
      throw new AppError('At least one ticket type is required', 400);
    }

    const ticketNames = ticketTypes.map(t => t.name);
    const uniqueNames = new Set(ticketNames);
    if (uniqueNames.size !== ticketNames.length) {
      throw new AppError('Duplicate ticket type names are not allowed', 400);
    }

    for (const ticket of ticketTypes) {
      if (!ticket.name || ticket.quota === undefined) {
        throw new AppError('Each ticket type must have a name and quota', 400);
      }
      if (Number(ticket.price) < 0) {
        throw new AppError('Ticket price cannot be negative', 400);
      }
      if (Number(ticket.quota) < 1) {
        throw new AppError('Ticket quota must be at least 1', 400);
      }
    }

    const organizer = await prisma.organizer.findUnique({
      where: { userId }
    });

    if (!organizer) {
      throw new AppError('Organizer not found', 404);
    }

    const slug = await generateUniqueSlug(data.name);

    // Use $transaction to atomically create event + ticket types
    const event = await prisma.$transaction(async (tx: TransactionClient) => {
      const createdEvent = await tx.event.create({
        data: {
          name: data.name,
          slug,
          categoryId: data.categoryId,
          eventDate: new Date(data.eventDate),
          eventTime: new Date(`1970-01-01T${data.eventTime}`),
          endDate: data.endDate ? new Date(data.endDate) : null,
          endTime: data.endTime ? new Date(`1970-01-01T${data.endTime}`) : null,
          cityId: data.cityId,
          venueName: data.venueName,
          venueAddress: data.venueAddress,
          description: data.description,
          organizerId: organizer.id,
          status: 'draft'
        }
      });

      // Create ticket types (inside the same transaction)
      await tx.ticketType.createMany({
        data: ticketTypes.map(ticket => ({
          eventId: createdEvent.id,
          name: ticket.name,
          description: ticket.description || null,
          price: Number(ticket.price),
          quota: Number(ticket.quota)
        }))
      });

      return createdEvent;
    });

    // Upload images (outside transaction — Cloudinary is not a DB operation)
    if (files?.length) {
      const uploadedPublicIds: string[] = [];

      try {
        const folder = buildCloudinaryFolder('events', event.id, 'images');

        for (const file of files) {
          const { secureUrl, publicId } = await cloudinaryUpload(
            file.buffer,
            folder
          );

          uploadedPublicIds.push(publicId);

          await prisma.eventImage.create({
            data: {
              eventId: event.id,
              imageUrl: secureUrl,
              imagePublicId: publicId
            }
          });
        }
      } catch (error) {
        // Rollback: delete already-uploaded images from Cloudinary
        for (const publicId of uploadedPublicIds) {
          await cloudinaryDelete(publicId);
        }

        // Rollback: delete event, ticket types, and image records
        await prisma.eventImage.deleteMany({ where: { eventId: event.id } });
        await prisma.ticketType.deleteMany({ where: { eventId: event.id } });
        await prisma.event.delete({ where: { id: event.id } });

        throw new AppError('Failed to upload event images', 500);
      }
    }

    // Return event with ticket types included
    const result = await prisma.event.findUnique({
      where: { id: event.id },
      include: {
        ticketTypes: true,
        eventImages: true
      }
    });

    return result;
  },

  async getAllEvents(query: GetAllEventsQuery) {
    const { search, category, city, page = '1', limit = '10' } = query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(50, Number(limit)));

    const where: any = {
      deletedAt: null,
      status: 'published',
      eventDate: {
        gte: new Date()
      }
    };

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    if (category) where.categoryId = category;
    if (city) where.cityId = city;

    const [events, totalItems] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          category: true,
          city: true,
          eventImages: true,
          ticketTypes: true
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { eventDate: 'asc' }
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
  },

  async getEventBySlug(slug: string) {
    const event = await prisma.event.findUnique({
      where: { slug },
      include: {
        category: true,
        city: true,
        eventImages: true,
        ticketTypes: true,
        eventVouchers: true
      }
    });

    if (!event || event.deletedAt) {
      throw new AppError('Event not found', 404);
    }

    // On-the-fly: auto-mark as completed if eventDate has passed
    if (
      event.status === 'published' &&
      new Date(event.eventDate) < new Date()
    ) {
      const updated = await prisma.event.update({
        where: { id: event.id },
        data: { status: 'completed' },
        include: {
          category: true,
          city: true,
          eventImages: true,
          ticketTypes: true,
          eventVouchers: true
        }
      });

      return updated;
    }

    return event;
  },

  async updateEvent(
    eventId: string,
    userId: string,
    data: UpdateEventInput,
    files: Express.Multer.File[]
  ) {
    const organizer = await prisma.organizer.findUnique({
      where: { userId }
    });

    if (!organizer) {
      throw new AppError('Organizer not found', 404);
    }

    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizerId: organizer.id
      },
      include: { eventImages: true }
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data
    });

    if (files?.length) {
      // Delete old images from Cloudinary
      for (const img of event.eventImages) {
        if (img.imagePublicId) {
          await cloudinaryDelete(img.imagePublicId);
        }
      }

      await prisma.eventImage.deleteMany({
        where: { eventId }
      });

      const uploadedPublicIds: string[] = [];

      try {
        const folder = buildCloudinaryFolder('events', eventId, 'images');

        for (const file of files) {
          const { secureUrl, publicId } = await cloudinaryUpload(
            file.buffer,
            folder
          );

          uploadedPublicIds.push(publicId);

          await prisma.eventImage.create({
            data: {
              eventId,
              imageUrl: secureUrl,
              imagePublicId: publicId
            }
          });
        }
      } catch (error) {
        // Rollback: delete already-uploaded images from Cloudinary
        for (const publicId of uploadedPublicIds) {
          await cloudinaryDelete(publicId);
        }

        throw new AppError('Failed to upload event images', 500);
      }
    }

    return updated;
  },

  async deleteEvent(eventId: string, userId: string) {
    const organizer = await prisma.organizer.findUnique({
      where: { userId }
    });

    if (!organizer) {
      throw new AppError('Organizer not found', 404);
    }

    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizerId: organizer.id
      },
      include: { eventImages: true }
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    for (const img of event.eventImages) {
      if (img.imagePublicId) {
        await cloudinaryDelete(img.imagePublicId);
      }
    }

    await prisma.eventImage.deleteMany({
      where: { eventId }
    });

    await prisma.event.update({
      where: { id: eventId },
      data: { deletedAt: new Date() }
    });

    return null;
  },

  async createVoucher(eventId: string, userId: string, data: any) {
    const organizer = await prisma.organizer.findUnique({
      where: { userId }
    });

    if (!organizer) {
      throw new AppError('Organizer not found', 404);
    }

    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizerId: organizer.id
      }
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    return prisma.eventVoucher.create({
      data: {
        ...data,
        eventId
      }
    });
  },

  async publishEvent(eventId: string, userId: string) {
    const organizer = await prisma.organizer.findUnique({
      where: { userId }
    });

    if (!organizer) {
      throw new AppError('Organizer not found', 404);
    }

    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizerId: organizer.id
      },
      include: {
        ticketTypes: true,
        eventImages: true
      }
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    if (event.status !== 'draft') {
      throw new AppError(
        `Cannot publish event with status '${event.status}'`,
        400
      );
    }

    // Validate event completeness before publishing
    if (
      !event.categoryId ||
      !event.cityId ||
      !event.venueName ||
      !event.description
    ) {
      throw new AppError(
        'Event must have category, city, venue name, and description before publishing',
        400
      );
    }

    if (!event.ticketTypes.length) {
      throw new AppError(
        'Event must have at least one ticket type before publishing',
        400
      );
    }

    if (!event.eventImages.length) {
      throw new AppError(
        'Event must have at least one image before publishing',
        400
      );
    }

    const published = await prisma.event.update({
      where: { id: eventId },
      data: { status: 'published' }
    });

    return published;
  },

  async cancelEvent(eventId: string, userId: string) {
    const organizer = await prisma.organizer.findUnique({
      where: { userId }
    });

    if (!organizer) {
      throw new AppError('Organizer not found', 404);
    }

    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizerId: organizer.id
      }
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    if (!['draft', 'published'].includes(event.status)) {
      throw new AppError(
        `Cannot cancel event with status '${event.status}'`,
        400
      );
    }

    const canceled = await prisma.event.update({
      where: { id: eventId },
      data: { status: 'canceled' }
    });

    return canceled;
  }
};
