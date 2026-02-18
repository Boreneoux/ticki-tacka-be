import { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import { authService } from '../services/auth.service';

const cookieOptions = {
  httpOnly: true,
  secure: false, //⚠️ Ubah true ketika production
  sameSite: 'lax' as const, //⚠️ Ubah 'strict' ketika production
  path: '/'
};

export const authController = {
  register: catchAsync(async (req: Request, res: Response) => {
    const {
      email,
      username,
      password,
      fullName,
      phoneNumber,
      role,
      referralCode,
      organizerName,
      companyAddress
    } = req.body;

    const result = await authService.register({
      email,
      username,
      password,
      fullName,
      phoneNumber,
      role,
      referralCode,
      organizerName,
      companyAddress
    });

    res.cookie('accessToken', result.token, cookieOptions);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: result
    });
  }),

  login: catchAsync(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    res.cookie('accessToken', result.token, cookieOptions);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  }),

  session: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;

    const result = await authService.session(id);

    res.status(200).json({
      success: true,
      message: 'User auth is successful',
      data: result
    });
  }),

  forgotPassword: catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body;

    const result = await authService.forgotPassword(email);

    res.status(200).json({
      success: true,
      message: result.message,
      data: null
    });
  }),

  resetPassword: catchAsync(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    const result = await authService.resetPassword(token, newPassword);

    res.status(200).json({
      success: true,
      message: result.message,
      data: null
    });
  })
};
