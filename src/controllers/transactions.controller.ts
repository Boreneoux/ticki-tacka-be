import { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import { transactionService } from '../services/transactions.service';

export const transactionController = {
  create: catchAsync(async (req: Request, res: Response) => {
    const { eventId, items, usePoints, userCouponId, eventVoucherId } =
      req.body;

    const result = await transactionService.createTransaction(req.user!.id, {
      eventId,
      items,
      usePoints,
      userCouponId,
      eventVoucherId
    });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: result
    });
  }),

  getAll: catchAsync(async (req: Request, res: Response) => {
    const result = await transactionService.getCustomerTransactions(
      req.user!.id,
      req.query as { status?: string; page?: string; limit?: string }
    );

    res.status(200).json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: result
    });
  }),

  getById: catchAsync(async (req: Request, res: Response) => {
    const transactionId = req.params.id as string;

    const result = await transactionService.getCustomerTransactionById(
      req.user!.id,
      transactionId
    );

    res.status(200).json({
      success: true,
      message: 'Transaction retrieved successfully',
      data: result
    });
  }),

  cancel: catchAsync(async (req: Request, res: Response) => {
    const transactionId = req.params.id as string;

    const result = await transactionService.cancelTransaction(
      req.user!.id,
      transactionId
    );

    res.status(200).json({
      success: true,
      message: 'Transaction canceled successfully',
      data: result
    });
  }),

  organizerGetAll: catchAsync(async (req: Request, res: Response) => {
    const result = await transactionService.getOrganizerTransactions(
      req.user!.id,
      req.query as {
        status?: string;
        eventId?: string;
        page?: string;
        limit?: string;
      }
    );

    res.status(200).json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: result
    });
  }),

  organizerGetById: catchAsync(async (req: Request, res: Response) => {
    const transactionId = req.params.id as string;

    const result = await transactionService.getOrganizerTransactionById(
      req.user!.id,
      transactionId
    );

    res.status(200).json({
      success: true,
      message: 'Transaction retrieved successfully',
      data: result
    });
  }),

  uploadPaymentProof: catchAsync(async (req: Request, res: Response) => {
    const transactionId = req.params.id as string;

    const result = await transactionService.uploadPaymentProof(
      transactionId,
      req.user!.id,
      req.file as Express.Multer.File
    );

    res.status(200).json({
      success: true,
      message: 'Payment proof uploaded successfully',
      data: result
    });
  })
};
