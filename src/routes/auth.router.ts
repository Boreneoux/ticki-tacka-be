import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller';
import { verifyToken } from '../middlewares/auth.middleware';
import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator
} from '../validators/auth.validator';
import { expressRequestValidation } from '../middlewares/express-request-validation.middleware';

const authRouter = Router();

// Rate limiter for forgot-password: max 5 requests per 15 minutes per IP
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many password reset requests, please try again later',
    data: null
  },
  standardHeaders: true,
  legacyHeaders: false
});

authRouter.post(
  '/register',
  registerValidator,
  expressRequestValidation,
  authController.register
);

authRouter.post(
  '/login',
  loginValidator,
  expressRequestValidation,
  authController.login
);

authRouter.get('/session', verifyToken, authController.session);

authRouter.post(
  '/forgot-password',
  forgotPasswordLimiter,
  forgotPasswordValidator,
  expressRequestValidation,
  authController.forgotPassword
);

authRouter.post(
  '/reset-password',
  resetPasswordValidator,
  expressRequestValidation,
  authController.resetPassword
);

export default authRouter;
