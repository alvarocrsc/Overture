import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import filmsRoutes from './routes/films.routes';
import seriesRoutes from './routes/series.routes';
import ratingsRoutes from './routes/ratings.routes';
import reviewsRoutes from './routes/reviews.routes';
import watchlistRoutes from './routes/watchlist.routes';
import listsRoutes from './routes/lists.routes';
import searchRoutes from './routes/search.routes';
import statsRoutes from './routes/stats.routes';

import { errorHandler } from './middleware/errorHandler';

const app = express();

// ─── Core Middleware ────────────────────────────────────────────────────────

app.use(
  cors({
    origin: [
      'http://localhost:8081',
      'http://localhost:19006',
      /^exp:\/\/.*/,
    ],
    credentials: true,
  }),
);

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Routes ─────────────────────────────────────────────────────────────────

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/films', filmsRoutes);
app.use('/api/v1/series', seriesRoutes);
app.use('/api/v1/ratings', ratingsRoutes);
app.use('/api/v1/reviews', reviewsRoutes);
app.use('/api/v1/watchlist', watchlistRoutes);
app.use('/api/v1/lists', listsRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/stats', statsRoutes);

// ─── Global Error Handler ────────────────────────────────────────────────────
// Must be registered last. Express 5 automatically forwards thrown errors from
// async route handlers to this handler.

app.use(errorHandler);

export default app;
