import express, { Express } from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { errorMiddleware } from './middlewares/error.middleware';
import authRouter from './routes/auth.router';
import { corsOptions } from './config/cors.config';

dotenv.config();

const PORT = process.env.PORT || 8000;
const app: Express = express();

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('tiny'));

// Routes
app.use('/api/auth', authRouter);

// Centralized Error Handler
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
});
