import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { errorMiddleware } from './middlewares/error.middleware';

dotenv.config();

const PORT = process.env.PORT || 8000;

const app = express();

app.use(express.json());
app.use(morgan('tiny'));

// Centralized Error Handler
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Application running on port ${PORT}`);
});
