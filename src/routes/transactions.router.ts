import { Router } from 'express';
import { transactionController } from '../controllers/transactions.controller';
import { verifyToken, roleGuard } from '../middlewares/auth.middleware';
import { multerUpload } from '../helpers/multer.helper';

const transactionRouter = Router();

transactionRouter.get(
  '/organizer',
  verifyToken,
  roleGuard('EO'),
  transactionController.organizerGetAll
);

transactionRouter.get(
  '/organizer/:id',
  verifyToken,
  roleGuard('EO'),
  transactionController.organizerGetById
);

/**
 * CUSTOMER ROUTES (User role)
 */
transactionRouter.post(
  '/',
  verifyToken,
  roleGuard('User'),
  transactionController.create
);

transactionRouter.get(
  '/',
  verifyToken,
  roleGuard('User'),
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
