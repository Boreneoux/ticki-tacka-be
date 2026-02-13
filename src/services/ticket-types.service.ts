import { prisma } from '../config/prisma-client.config';
import { AppError } from '../utils/AppError';

interface CreateTicketTypeInput {
    name: string;
    description?: string;
    price: number;
    quota: number;
}

interface UpdateTicketTypeInput {
    name?: string;
    description?: string;
    price?: number;
    quota?: number;
}

const isValidUUID = (id: string) => {
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};

export const ticketTypeService = {
    async createTicketType(
        eventId: string,
        userId: string,
        data: CreateTicketTypeInput
    ) {
        if (!isValidUUID(eventId)) {
            throw new AppError('Invalid event ID format', 400);
        }

        if (!data.name || data.quota === undefined) {
            throw new AppError('Ticket name and quota are required', 400);
        }

        if (data.price < 0) {
            throw new AppError('Price cannot be negative', 400);
        }

        if (data.quota < 1) {
            throw new AppError('Quota must be at least 1', 400);
        }

        const organizer = await prisma.organizer.findUnique({
            where: { userId }
        });

        if (!organizer) {
            throw new AppError('Organizer not found', 404);
        }

        const event = await prisma.event.findFirst({
            where: {
                id: eventId,
                organizerId: organizer.id,
                deletedAt: null
            }
        });

        if (!event) {
            throw new AppError('Event not found', 404);
        }

        if (!['draft', 'published'].includes(event.status)) {
            throw new AppError(
                `Cannot add ticket types to event with status '${event.status}'`,
                400
            );
        }

        const existingTicket = await prisma.ticketType.findFirst({
            where: {
                eventId,
                name: data.name,
                deletedAt: null
            }
        });

        if (existingTicket) {
            throw new AppError(
                'A ticket type with this name already exists for this event',
                409
            );
        }

        const ticketType = await prisma.ticketType.create({
            data: {
                eventId,
                name: data.name,
                description: data.description ?? null,
                price: Number(data.price),
                quota: Number(data.quota)
            }
        });

        return ticketType;
    },

    async getTicketTypesByEvent(eventId: string) {
        if (!isValidUUID(eventId)) {
            throw new AppError('Invalid event ID format', 400);
        }

        const event = await prisma.event.findUnique({
            where: { id: eventId }
        });

        if (!event || event.deletedAt) {
            throw new AppError('Event not found', 404);
        }

        return prisma.ticketType.findMany({
            where: {
                eventId,
                deletedAt: null
            },
            orderBy: { price: 'asc' }
        });
    },

    async updateTicketType(
        ticketTypeId: string,
        eventId: string,
        userId: string,
        data: UpdateTicketTypeInput
    ) {
        if (!isValidUUID(eventId) || !isValidUUID(ticketTypeId)) {
            throw new AppError('Invalid ID format', 400);
        }

        const organizer = await prisma.organizer.findUnique({
            where: { userId }
        });

        if (!organizer) {
            throw new AppError('Organizer not found', 404);
        }

        const event = await prisma.event.findFirst({
            where: {
                id: eventId,
                organizerId: organizer.id,
                deletedAt: null
            }
        });

        if (!event) {
            throw new AppError('Event not found', 404);
        }

        const ticketType = await prisma.ticketType.findFirst({
            where: {
                id: ticketTypeId,
                eventId,
                deletedAt: null
            }
        });

        if (!ticketType) {
            throw new AppError('Ticket type not found', 404);
        }

        if (data.quota !== undefined && data.quota < ticketType.soldCount) {
            throw new AppError(
                `Quota cannot be less than sold tickets (${ticketType.soldCount})`,
                400
            );
        }

        if (data.price !== undefined && data.price < 0) {
            throw new AppError('Price cannot be negative', 400);
        }

        if (data.name && data.name !== ticketType.name) {
            const duplicate = await prisma.ticketType.findFirst({
                where: {
                    eventId,
                    name: data.name,
                    deletedAt: null,
                    id: { not: ticketTypeId }
                }
            });

            if (duplicate) {
                throw new AppError(
                    'A ticket type with this name already exists for this event',
                    409
                );
            }
        }

        return prisma.ticketType.update({
            where: { id: ticketTypeId },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && {
                    description: data.description
                }),
                ...(data.price !== undefined && { price: Number(data.price) }),
                ...(data.quota !== undefined && { quota: Number(data.quota) })
            }
        });
    },

    async deleteTicketType(
        ticketTypeId: string,
        eventId: string,
        userId: string
    ) {
        if (!isValidUUID(eventId) || !isValidUUID(ticketTypeId)) {
            throw new AppError('Invalid ID format', 400);
        }

        const organizer = await prisma.organizer.findUnique({
            where: { userId }
        });

        if (!organizer) {
            throw new AppError('Organizer not found', 404);
        }

        const event = await prisma.event.findFirst({
            where: {
                id: eventId,
                organizerId: organizer.id,
                deletedAt: null
            }
        });

        if (!event) {
            throw new AppError('Event not found', 404);
        }

        const ticketType = await prisma.ticketType.findFirst({
            where: {
                id: ticketTypeId,
                eventId,
                deletedAt: null
            }
        });

        if (!ticketType) {
            throw new AppError('Ticket type not found', 404);
        }

        if (ticketType.soldCount > 0) {
            throw new AppError(
                'Cannot delete a ticket type that already has sold tickets',
                400
            );
        }

        await prisma.ticketType.update({
            where: { id: ticketTypeId },
            data: { deletedAt: new Date() }
        });

        return null;
    }
};
