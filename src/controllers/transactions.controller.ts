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
    })
};
