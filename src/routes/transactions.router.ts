import { Router } from 'express';
import { transactionController } from '../controllers/transactions.controller';
import { verifyToken, roleGuard } from '../middlewares/auth.middleware';
import { multerUpload } from '../helpers/multer.helper';
import {
  createTransactionValidator,
  getCustomerTransactionsValidator,
  getOrganizerTransactionsValidator
} from '../validators/transaction.validator';
import { expressRequestValidation } from '../middlewares/express-request-validation.middleware';

const transactionRouter = Router();

transactionRouter.get(
  '/organizer',
  verifyToken,
  roleGuard('EO'),
  getOrganizerTransactionsValidator,
  expressRequestValidation,
  transactionController.organizerGetAll
);

transactionRouter.get(
  '/organizer/:id',
  verifyToken,
  roleGuard('EO'),
  transactionController.organizerGetById
);

transactionRouter.patch(
  '/:id/accept',
  verifyToken,
  roleGuard('EO'),
  transactionController.accept
);

transactionRouter.patch(
  '/:id/reject',
  verifyToken,
  roleGuard('EO'),
  transactionController.reject
);

/**
 * CUSTOMER ROUTES (User role)
 */
transactionRouter.post(
  '/',
  verifyToken,
  roleGuard('User'),
  createTransactionValidator,
  expressRequestValidation,
  transactionController.create
);

transactionRouter.get(
  '/',
  verifyToken,
  roleGuard('User'),
  getCustomerTransactionsValidator,
  expressRequestValidation,
  transactionController.getAll
);

transactionRouter.get(
  '/:id',
  verifyToken,
  roleGuard('User'),
  transactionController.getById
);

transactionRouter.patch(
  '/:id/cancel',
  verifyToken,
  roleGuard('User'),
  transactionController.cancel
);

transactionRouter.patch(
  '/:id/payment-proof',
  verifyToken,
  roleGuard('User'),
  multerUpload('', 'PAYMENT-PROOF').single('paymentProof'),
  transactionController.uploadPaymentProof
);

export default transactionRouter;
