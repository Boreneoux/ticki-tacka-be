import express, { Express } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { errorMiddleware } from './middlewares/error.middleware';
import authRouter from './routes/auth.router';
import userRouter from './routes/user.router';
import locationRouter from './routes/location.router';
import eventRouter from './routes/events.router';
import ticketTypeRouter from './routes/ticket-types.router';
import categoryRouter from './routes/categories.router';
import transactionRouter from './routes/transactions.router';
import reviewRouter from './routes/reviews.router';
import { organizerReviewRouter } from './routes/reviews.router';
import dashboardRouter from './routes/dashboard.router';

import { mainJobs } from './jobs/main.job';
import { corsOptions } from './config/cors.config';
import { PORT } from './config/main.config';

const serverPort = PORT || 8000;
const app: Express = express();

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('tiny'));
// Routes
app.use('/api/events/:eventId/ticket-types', ticketTypeRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/locations', locationRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/events', eventRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/events/:eventId/reviews', reviewRouter);
app.use('/api/organizers/:organizerId/reviews', organizerReviewRouter);
app.use('/api/organizer', dashboardRouter);
// Centralized Error Handler
app.use(errorMiddleware);

app.listen(serverPort, () => {
  console.log(
    `⚡️[server]: Server is running at http://localhost:${serverPort}`
  );

  // Start cron jobs
  mainJobs();
});
