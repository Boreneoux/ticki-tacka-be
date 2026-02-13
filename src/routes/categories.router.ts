import { Router } from 'express';
import { categoryController } from '../controllers/categories.controller';

const categoryRouter = Router();

categoryRouter.get('/', categoryController.getAllCategories);

export default categoryRouter;
