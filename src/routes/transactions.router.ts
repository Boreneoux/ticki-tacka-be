import { Router } from 'express';
import { transactionController } from '../controllers/transactions.controller';
import { verifyToken, roleGuard } from '../middlewares/auth.middleware';

const transactionRouter = Router();

/**
 * CUSTOMER ROUTES (User role)
 */
transactionRouter.post(
    '/',
    verifyToken,
    roleGuard('User'),
    transactionController.create
);

export default transactionRouter;
