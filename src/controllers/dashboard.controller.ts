import { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import { dashboardService } from '../services/dashboard.service';

export const dashboardController = {
  getEvents: catchAsync(async (req: Request, res: Response) => {
    const result = await dashboardService.getOrganizerEvents(
      req.user!.id,
      req.query as {
        status?: string;
        search?: string;
        category?: string;
        page?: string;
        limit?: string;
      }
    );

    res.status(200).json({
      success: true,
      message: 'Organizer events retrieved successfully',
      data: result
    });
  }),

  getAttendees: catchAsync(async (req: Request, res: Response) => {
    const eventId = req.params.eventId as string;

    const result = await dashboardService.getEventAttendees(
      req.user!.id,
      eventId,
      req.query as { page?: string; limit?: string }
    );

    res.status(200).json({
      success: true,
      message: 'Event attendees retrieved successfully',
      data: result
    });
  }),

  getStatistics: catchAsync(async (req: Request, res: Response) => {
    const result = await dashboardService.getStatistics(
      req.user!.id,
      req.query as {
        filterBy?: 'year' | 'month' | 'day';
        year?: string;
        month?: string;
      }
    );

    res.status(200).json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: result
    });
  }),

  /**
   * GET /api/organizer/events/:eventId/statistics
   * Returns statistics for a specific organizer event.
   */
  getEventStatistics: catchAsync(async (req: Request, res: Response) => {
    const eventId = req.params.eventId as string;

    const result = await dashboardService.getEventStatistics(
      req.user!.id,
      eventId,
      req.query as {
        filterBy?: 'year' | 'month' | 'day';
        year?: string;
        month?: string;
      }
    );

    res.status(200).json({
      success: true,
      message: 'Event statistics retrieved successfully',
      data: result
    });
  })
};
