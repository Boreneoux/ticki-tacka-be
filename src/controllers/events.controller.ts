import { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import { eventService } from '../services/events.service';

export const eventController = {
  create: catchAsync(async (req: Request, res: Response) => {
    const {
      name,
      categoryId,
      eventDate,
      eventTime,
      endDate,
      endTime,
      cityId,
      venueName,
      venueAddress,
      description,
      ticketTypes
    } = req.body;

    // Parse ticketTypes from JSON string (form-data sends strings)
    const parsedTicketTypes = typeof ticketTypes === 'string'
      ? JSON.parse(ticketTypes)
      : ticketTypes;

    const result = await eventService.createEvent(
      req.user!.id,
      {
        name,
        categoryId,
        eventDate,
        eventTime,
        endDate,
        endTime,
        cityId,
        venueName,
        venueAddress,
        description
      },
      parsedTicketTypes,
      req.files as Express.Multer.File[]
    );

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: result
    });
  }),

  getAll: catchAsync(async (req: Request, res: Response) => {
    const result = await eventService.getAllEvents(req.query);

    res.status(200).json({
      success: true,
      message: 'Events retrieved successfully',
      data: result
    });
  }),

  getDetail: catchAsync(async (req: Request, res: Response) => {
    const slug = req.params.slug as string;

    const result = await eventService.getEventBySlug(slug);

    res.status(200).json({
      success: true,
      message: 'Event retrieved successfully',
      data: result
    });
  }),

  update: catchAsync(async (req: Request, res: Response) => {
    const eventId = req.params.id as string;
    const {
      name,
      categoryId,
      eventDate,
      eventTime,
      endDate,
      endTime,
      cityId,
      venueName,
      venueAddress,
      description
    } = req.body;

    const result = await eventService.updateEvent(
      eventId,
      req.user!.id,
      {
        name,
        categoryId,
        eventDate,
        eventTime,
        endDate,
        endTime,
        cityId,
        venueName,
        venueAddress,
        description
      },
      req.files as Express.Multer.File[]
    );

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: result
    });
  }),

  remove: catchAsync(async (req: Request, res: Response) => {
    const eventId = req.params.id as string;

    await eventService.deleteEvent(eventId, req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
      data: null
    });
  }),

  createVoucher: catchAsync(async (req: Request, res: Response) => {
    const eventId = req.params.eventId as string;

    const result = await eventService.createVoucher(
      eventId,
      req.user!.id,
      req.body
    );

    res.status(201).json({
      success: true,
      message: 'Voucher created successfully',
      data: result
    });
  }),

  publish: catchAsync(async (req: Request, res: Response) => {
    const eventId = req.params.id as string;

    const result = await eventService.publishEvent(eventId, req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Event published successfully',
      data: result
    });
  }),

  cancel: catchAsync(async (req: Request, res: Response) => {
    const eventId = req.params.id as string;

    const result = await eventService.cancelEvent(eventId, req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Event canceled successfully',
      data: result
    });
  })
};
