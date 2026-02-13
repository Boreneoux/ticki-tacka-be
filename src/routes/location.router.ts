import { Router } from 'express';
import { locationController } from '../controllers/location.controller';

const locationRouter = Router();

locationRouter.get('/provinces', locationController.getAllProvinces);
locationRouter.get(
  '/provinces/:provinceId/cities',
  locationController.getCitiesByProvince
);

export default locationRouter;
