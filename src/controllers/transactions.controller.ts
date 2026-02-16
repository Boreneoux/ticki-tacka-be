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
