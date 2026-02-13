import express, { Express } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { errorMiddleware } from './middlewares/error.middleware';
import authRouter from './routes/auth.router';
import userRouter from './routes/user.router';
import locationRouter from './routes/location.router';
import eventRouter from './routes/events.router';
import { corsOptions } from './config/cors.config';
import { PORT } from './config/main.config';
import ticketTypeRouter from './routes/ticket-types.router';
import categoryRouter from './routes/categories.router';

const serverPort = PORT || 8000;
const app: Express = express();

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('tiny'));
// Routes
app.use("/api/events/:eventId/ticket-types", ticketTypeRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/locations', locationRouter);
app.use('/api/events', eventRouter);
app.use('/api/categories', categoryRouter);

// Centralized Error Handler
app.use(errorMiddleware);

app.listen(serverPort, () => {
  console.log(
    `⚡️[server]: Server is running at http://localhost:${serverPort}`
  );
});
