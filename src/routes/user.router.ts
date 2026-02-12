import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { verifyToken } from '../middlewares/auth.middleware';
import { multerUpload } from '../helpers/multer.helper';

const userRouter = Router();

userRouter.get('/profile', verifyToken, userController.getProfile);

userRouter.patch(
  '/profile',
  verifyToken,
  multerUpload('', 'PROFILE').single('profilePicture'),
  userController.updateProfile
);

userRouter.patch('/password', verifyToken, userController.changePassword);

export default userRouter;
