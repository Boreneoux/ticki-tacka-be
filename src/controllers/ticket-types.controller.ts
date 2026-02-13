import { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import { ticketTypeService } from '../services/ticket-types.service';

export const ticketTypeController = {
    create: catchAsync(async (req: Request, res: Response) => {
        const eventId = req.params.eventId as string;
        const { name, description, price, quota } = req.body;

        const result = await ticketTypeService.createTicketType(
            eventId,
            req.user!.id,
            { name, description, price, quota }
        );

        res.status(201).json({
            success: true,
            message: 'Ticket type created successfully',
            data: result
        });
    }),

    getByEvent: catchAsync(async (req: Request, res: Response) => {
        const eventId = req.params.eventId as string;

        const result = await ticketTypeService.getTicketTypesByEvent(eventId);

        res.status(200).json({
            success: true,
            message: 'Ticket types retrieved successfully',
            data: result
        });
    }),

    update: catchAsync(async (req: Request, res: Response) => {
        const eventId = req.params.eventId as string;
        const ticketTypeId = req.params.ticketTypeId as string;
        const { name, description, price, quota } = req.body;

        const result = await ticketTypeService.updateTicketType(
            ticketTypeId,
            eventId,
            req.user!.id,
            { name, description, price, quota }
        );

        res.status(200).json({
            success: true,
            message: 'Ticket type updated successfully',
            data: result
        });
    }),

    remove: catchAsync(async (req: Request, res: Response) => {
        const eventId = req.params.eventId as string;
        const ticketTypeId = req.params.ticketTypeId as string;

        await ticketTypeService.deleteTicketType(
            ticketTypeId,
            eventId,
            req.user!.id
        );

        res.status(200).json({
            success: true,
            message: 'Ticket type deleted successfully',
            data: null
        });
    })
};
