import { Request, Response } from "express";
import { eventService } from "../services/events.service";
import { catchAsync } from "../utils/catch-async";

export const create = catchAsync(
  async (req: Request, res: Response) => {
    const result = await eventService.createEvent(
      req.user!.id,
      req.body,
      req.files as Express.Multer.File[]
    );

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: result,
    });
  }
);

export const getAll = catchAsync(
  async (_req: Request, res: Response) => {
    const result = await eventService.getAllEvents();

    res.status(200).json({
      success: true,
      data: result,
    });
  }
);

export const getDetail = catchAsync(
  async (req: Request, res: Response) => {
    const result = await eventService.getEventBySlug(
      req.params.slug as string
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  }
);

export const update = catchAsync(
  async (req: Request, res: Response) => {
    const result = await eventService.updateEvent(
      req.params.id as string,
      req.user!.id,
      req.body,
      req.files as Express.Multer.File[]
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  }
);

export const remove = catchAsync(
  async (req: Request, res: Response) => {
    await eventService.deleteEvent(
      req.params.id as string,
      req.user!.id
    );

    res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  }
);
