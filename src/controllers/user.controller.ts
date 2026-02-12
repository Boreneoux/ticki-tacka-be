import { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import { userService } from '../services/user.service';

export const userController = {
  getProfile: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;

    const result = await userService.getProfile(id);

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: result
    });
  }),

  updateProfile: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { username, fullName, phoneNumber, organizerName, companyAddress } =
      req.body;

    const result = await userService.updateProfile(
      id,
      { username, fullName, phoneNumber, organizerName, companyAddress },
      req.file
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: result
    });
  }),

  changePassword: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { oldPassword, newPassword } = req.body;

    await userService.changePassword(id, { oldPassword, newPassword });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      data: null
    });
  })
};
