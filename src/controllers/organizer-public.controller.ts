import { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import { organizerPublicService } from '../services/organizer-public.service';

export const organizerPublicController = {
  getProfile: catchAsync(async (req: Request, res: Response) => {
    const username = req.params.username as string;
    const result = await organizerPublicService.getPublicProfile(username);

    res.status(200).json({
      success: true,
      message: 'Organizer profile retrieved successfully',
      data: result
    });
  }),

  getEvents: catchAsync(async (req: Request, res: Response) => {
    const organizerId = req.params.organizerId as string;
    const result = await organizerPublicService.getPublicEvents(
      organizerId,
      req.query
    );

    res.status(200).json({
      success: true,
      message: 'Organizer events retrieved successfully',
      data: result
    });
  })
};
