import { prisma } from "../config/prisma-client.config";
import { AppError } from "../utils/AppError";
import {
  buildCloudinaryFolder,
  cloudinaryUpload,
  cloudinaryDelete,
} from "../helpers/cloudinary.helper";

type EventModel = Awaited<ReturnType<typeof prisma.event.findFirst>>;

type CreateEventDTO = Pick<
  NonNullable<EventModel>,
  | "name"
  | "slug"
  | "categoryId"
  | "eventDate"
  | "eventTime"
  | "endDate"
  | "endTime"
  | "cityId"
  | "venueName"
  | "venueAddress"
  | "description"
>;

export const eventService = {
  async createEvent(
    userId: string,
    data: CreateEventDTO,
    files: Express.Multer.File[]
  ) {
    if (!data.name || !data.slug) {
      throw new AppError("Missing required fields", 400);
    }

    const event = await prisma.event.create({
      data: {
        ...data,
        organizerId: userId,
        status: "draft",
      },
    });

    if (files?.length) {
      const folder = buildCloudinaryFolder("events", event.id, "images");

      for (const file of files) {
        const { secureUrl, publicId } = await cloudinaryUpload(
          file.buffer,
          folder
        );

        await prisma.eventImage.create({
          data: {
            eventId: event.id,
            imageUrl: secureUrl,
            imagePublicId: publicId,
          },
        });
      }
    }

    return event;
  },

  async getAllEvents() {
    return prisma.event.findMany({
      where: {
        deletedAt: null,
      },
    });
  },

  async getEventBySlug(slug: string) {
    const event = await prisma.event.findUnique({
      where: { slug },
    });

    if (!event) {
      throw new AppError("Event not found", 404);
    }

    return event;
  },

  async updateEvent(
    eventId: string,
    userId: string,
    data: Partial<CreateEventDTO>,
    files: Express.Multer.File[]
  ) {
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizerId: userId,
      },
      include: { eventImages: true },
    });

    if (!event) {
      throw new AppError("Event not found", 404);
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data,
    });

    if (files?.length) {
      for (const img of event.eventImages) {
        if (img.imagePublicId) {
          await cloudinaryDelete(img.imagePublicId);
        }
      }

      await prisma.eventImage.deleteMany({
        where: { eventId },
      });

      const folder = buildCloudinaryFolder("events", eventId, "images");

      for (const file of files) {
        const { secureUrl, publicId } = await cloudinaryUpload(
          file.buffer,
          folder
        );

        await prisma.eventImage.create({
          data: {
            eventId,
            imageUrl: secureUrl,
            imagePublicId: publicId,
          },
        });
      }
    }

    return updated;
  },

  async deleteEvent(eventId: string, userId: string) {
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizerId: userId,
      },
      include: { eventImages: true },
    });

    if (!event) {
      throw new AppError("Event not found", 404);
    }

    for (const img of event.eventImages) {
      if (img.imagePublicId) {
        await cloudinaryDelete(img.imagePublicId);
      }
    }

    await prisma.eventImage.deleteMany({
      where: { eventId },
    });

    await prisma.event.update({
      where: { id: eventId },
      data: {
        deletedAt: new Date(),
      },
    });

    return null;
  },
};
