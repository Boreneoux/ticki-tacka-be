import { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import { locationService } from '../services/location.service';

export const locationController = {
  getAllProvinces: catchAsync(async (_req: Request, res: Response) => {
    const result = await locationService.getAllProvinces();

    res.status(200).json({
      success: true,
      message: 'Provinces retrieved successfully',
      data: result
    });
  }),

  getCitiesByProvince: catchAsync(async (req: Request, res: Response) => {
    const provinceId = req.params.provinceId as string;

    const result = await locationService.getCitiesByProvince(provinceId);

    res.status(200).json({
      success: true,
      message: 'Cities retrieved successfully',
      data: result
    });
  })
};
