import { Router } from 'express';
import { transactionController } from '../controllers/transactions.controller';
import { verifyToken, roleGuard } from '../middlewares/auth.middleware';
import { multerUpload } from '../helpers/multer.helper';

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

transactionRouter.patch(
    '/:id/payment-proof',
    verifyToken,
    roleGuard('User'),
    multerUpload('', 'PAYMENT-PROOF').single('paymentProof'),
    transactionController.uploadPaymentProof
);

export default transactionRouter;
