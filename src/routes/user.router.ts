import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { verifyToken } from '../middlewares/auth.middleware';
import { multerUpload } from '../helpers/multer.helper';
import {
  updateProfileValidator,
  changePasswordValidator
} from '../validators/user.validator';
import { expressRequestValidation } from '../middlewares/express-request-validation.middleware';

const userRouter = Router();

userRouter.get('/profile', verifyToken, userController.getProfile);

userRouter.patch(
  '/profile',
  verifyToken,
  multerUpload('', 'PROFILE').single('profilePicture'),
  updateProfileValidator,
  expressRequestValidation,
  userController.updateProfile
);

userRouter.patch(
  '/password',
  verifyToken,
  changePasswordValidator,
  expressRequestValidation,
  userController.changePassword
);

export default userRouter;
