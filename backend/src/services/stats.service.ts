import { query } from '../config/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StatsPeriod = 'month' | 'year' | 'all';

interface DateFilter {
  clause: string;
  params: (string | number | boolean | null)[];
}

interface OverviewRow {
  total_logged: number;
  films_count: number;
  series_count: number;
  days_with_activity: number;
  rewatch_count: number;
  avg_rating: number | null;
}

interface MinutesRow {
  film_minutes: number;
  series_minutes: number;
}

interface ReviewCountRow {
  review_count: number;
}

interface WeeksActiveRow {
  weeks_active: number | null;
}

interface RatingDistributionRow {
  value: number;
  count: number;
}

interface GenreRow {
  id: number;
  name: string;
  count: number;
}

interface DecadeRow {
  decade: string;
  count: number;
}

interface PersonRow {
  person_tmdb_id: number;
  person_name: string;
  profile_path: string | null;
  film_count: number;
}

interface CalendarRow {
  date: string;
  count: number;
  highest_rating: number;
  film_backdrop: string | null;
  series_backdrop: string | null;
}

interface ActivityDateRow {
  activity_date: string;
}

interface PercentileRow {
  total_users: number;
  users_with_more_films: number | null;
}

export interface CalendarEntry {
  date: string;
  count: number;
  highest_rating: number;
  backdrop_path: string | null;
}

export interface StreakData {
  current: number;
  longest: number;
  last_7_days: boolean[];
}

export interface StatsResult {
  period: StatsPeriod;
  overview: {
    total_logged: number;
    films_count: number;
    series_count: number;
    rewatch_count: number;
    avg_rating: number;
    avg_per_week: number;
    review_count: number;
    percentile: string;
  };
  time: {
    film_minutes: number;
    series_minutes: number;
    total_minutes: number;
    total_days: number;
  };
  rating_distribution: { value: number; count: number }[];
  top_genres: { id: number; name: string; count: number }[];
  top_decades: { decade: string; count: number }[];
  most_watched: {
    directors: PersonRow[];
    actors: PersonRow[];
  };
  calendar: CalendarEntry[];
  streak: StreakData;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a parameterised WHERE date clause for the given period.
 * 'all' returns an empty clause with no params.
 * @param period - The stats period ('month' | 'year' | 'all').
 * @returns An object with the SQL clause string and its bind params.
 */
function buildDateFilter(period: StatsPeriod): DateFilter {
  if (period === 'month') {
    return {
      clause: `AND r.watched_on >= DATE_FORMAT(NOW(), '%Y-%m-01')`,
      params: [],
    };
  }
  if (period === 'year') {
    return {
      clause: `AND r.watched_on >= DATE_FORMAT(NOW(), '%Y-01-01')`,
      params: [],
    };
  }
  return { clause: '', params: [] };
}

/**
 * Resolves the period param string to a valid StatsPeriod, defaulting to 'all'.
 * @param raw - Raw string from req.query.period.
 * @returns A valid StatsPeriod value.
 */
export function resolvePeriod(raw: string | undefined): StatsPeriod {
  if (raw === 'month' || raw === 'year' || raw === 'all') return raw;
  return 'all';
}

/**
 * Computes current streak, longest streak, and last-7-days activity from
 * a sorted (DESC) list of distinct activity dates.
 * @param dates - ISO date strings (YYYY-MM-DD) ordered most-recent first.
 * @returns Streak data object.
 */
function computeStreak(dates: string[]): StreakData {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateSet = new Set(dates);

  // last_7_days: index 0 = today, index 6 = 6 days ago
  const last7: boolean[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last7.push(dateSet.has(d.toISOString().slice(0, 10)));
  }

  // Current streak: consecutive days ending today or yesterday
  let current = 0;
  const startOffset = dateSet.has(today.toISOString().slice(0, 10)) ? 0 : 1;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - startOffset);

  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(startDate);
    expected.setDate(expected.getDate() - i);
    if (dates[i] === expected.toISOString().slice(0, 10)) {
      current++;
    } else {
      break;
    }
  }

  // Longest streak across all dates (already sorted DESC — reverse to ASC)
  const asc = [...dates].reverse();
  let longest = 0;
  let run = 0;
  for (let i = 0; i < asc.length; i++) {
    if (i === 0) {
      run = 1;
    } else {
      const prev = new Date(asc[i - 1]!);
      prev.setDate(prev.getDate() + 1);
      if (asc[i] === prev.toISOString().slice(0, 10)) {
        run++;
      } else {
        run = 1;
      }
    }
    if (run > longest) longest = run;
  }

  return { current, longest, last_7_days: last7 };
}

// ---------------------------------------------------------------------------
// Exported service function
// ---------------------------------------------------------------------------

/**
 * Returns comprehensive stats for the authenticated user for the given period.
 * All DB queries run in parallel via Promise.all.
 * @param userId - The authenticated user's ID.
 * @param period - The stats period ('month' | 'year' | 'all').
 * @returns A fully-populated StatsResult object.
 */
export async function getMyStats(
  userId: number,
  period: StatsPeriod,
): Promise<StatsResult> {
  const df = buildDateFilter(period);

  // Run all queries in parallel.
  const [
    overviewRows,
    minutesRows,
    reviewCountRows,
    distributionRows,
    genreRows,
    decadeRows,
    directorRows,
    actorRows,
    calendarRows,
    activityRows,
    percentileRows,
  ] = await Promise.all([
    // Q1 — Overview counts
    query<OverviewRow>(
      `SELECT
         COUNT(*) AS total_logged,
         SUM(CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END) AS films_count,
         SUM(CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END) AS series_count,
         COUNT(DISTINCT DATE(r.watched_on)) AS days_with_activity,
         SUM(CASE WHEN r.is_rewatch = 1 THEN 1 ELSE 0 END) AS rewatch_count,
         ROUND(AVG(r.value), 2) AS avg_rating
       FROM ratings r
       LEFT JOIN films  f ON r.film_id   = f.id
       LEFT JOIN series s ON r.series_id = s.id
       WHERE r.user_id = ? ${df.clause}`,
      [userId, ...df.params],
    ),

    // Q2 — Minutes watched
    query<MinutesRow>(
      `SELECT
         COALESCE(SUM(f.runtime_min), 0) AS film_minutes,
         COALESCE(SUM(
           CASE WHEN s.episode_runtime IS NOT NULL
           THEN s.episode_runtime * s.episodes_count
           ELSE 0 END
         ), 0) AS series_minutes
       FROM ratings r
       LEFT JOIN films  f ON r.film_id   = f.id
       LEFT JOIN series s ON r.series_id = s.id
       WHERE r.user_id = ? ${df.clause}`,
      [userId, ...df.params],
    ),

    // Q3 — Review count
    query<ReviewCountRow>(
      `SELECT COUNT(*) AS review_count
       FROM reviews rev
       JOIN ratings r ON rev.rating_id = r.id
       WHERE r.user_id = ? ${df.clause}`,
      [userId, ...df.params],
    ),

    // Q5 — Rating distribution
    query<RatingDistributionRow>(
      `SELECT r.value, COUNT(*) AS count
       FROM ratings r
       LEFT JOIN films  f ON r.film_id   = f.id
       LEFT JOIN series s ON r.series_id = s.id
       WHERE r.user_id = ? ${df.clause}
       GROUP BY r.value
       ORDER BY r.value ASC`,
      [userId, ...df.params],
    ),

    // Q6 — Top genres
    query<GenreRow>(
      `SELECT g.id, g.name, COUNT(*) AS count
       FROM ratings r
       JOIN films      f  ON r.film_id    = f.id
       JOIN film_genres fg ON f.id        = fg.film_id
       JOIN genres     g  ON fg.genre_id  = g.id
       WHERE r.user_id = ? ${df.clause}
       GROUP BY g.id, g.name
       ORDER BY count DESC
       LIMIT 5`,
      [userId, ...df.params],
    ),

    // Q7 — Top decades
    query<DecadeRow>(
      `SELECT
         CONCAT(FLOOR(YEAR(f.release_date) / 10) * 10, 's') AS decade,
         COUNT(*) AS count
       FROM ratings r
       JOIN films f ON r.film_id = f.id
       WHERE r.user_id = ?
         AND f.release_date IS NOT NULL
         ${df.clause}
       GROUP BY decade
       ORDER BY decade DESC`,
      [userId, ...df.params],
    ),

    // Q8 — Most watched directors
    query<PersonRow>(
      `SELECT
         fc.person_tmdb_id,
         fc.person_name,
         fc.profile_path,
         COUNT(*) AS film_count
       FROM ratings r
       JOIN films       f  ON r.film_id  = f.id
       JOIN film_credits fc ON fc.film_id = f.id
       WHERE r.user_id = ?
         AND fc.role = 'director'
         ${df.clause}
       GROUP BY fc.person_tmdb_id, fc.person_name, fc.profile_path
       ORDER BY film_count DESC
       LIMIT 3`,
      [userId, ...df.params],
    ),

    // Q9 — Most watched actors
    query<PersonRow>(
      `SELECT
         fc.person_tmdb_id,
         fc.person_name,
         fc.profile_path,
         COUNT(*) AS film_count
       FROM ratings r
       JOIN films       f  ON r.film_id  = f.id
       JOIN film_credits fc ON fc.film_id = f.id
       WHERE r.user_id = ?
         AND fc.role = 'actor'
         ${df.clause}
       GROUP BY fc.person_tmdb_id, fc.person_name, fc.profile_path
       ORDER BY film_count DESC
       LIMIT 3`,
      [userId, ...df.params],
    ),

    // Q10 — Calendar (always current month, ignores period filter)
    // DATE_FORMAT forces MySQL to return a plain string so mysql2 never
    // wraps it in a JS Date object, which would shift the value on toISOString().
    query<CalendarRow>(
      `SELECT
         DATE_FORMAT(DATE(watched_on), '%Y-%m-%d') AS date,
         COUNT(*)                                  AS count,
         MAX(r.value)                              AS highest_rating,
         f.backdrop_path                           AS film_backdrop,
         s.backdrop_path                           AS series_backdrop
       FROM ratings r
       LEFT JOIN films  f ON r.film_id   = f.id
       LEFT JOIN series s ON r.series_id = s.id
       WHERE r.user_id = ?
         AND watched_on >= DATE_FORMAT(NOW(), '%Y-%m-01')
         AND watched_on <  DATE_FORMAT(NOW() + INTERVAL 1 MONTH, '%Y-%m-01')
       GROUP BY DATE_FORMAT(DATE(watched_on), '%Y-%m-%d'), f.backdrop_path, s.backdrop_path
       ORDER BY date ASC`,
      [userId],
    ),

    // Q11 — Activity dates for streak (last 365 days)
    query<ActivityDateRow>(
      `SELECT DATE_FORMAT(DATE(watched_on), '%Y-%m-%d') AS activity_date
       FROM ratings
       WHERE user_id = ?
         AND watched_on IS NOT NULL
       GROUP BY DATE_FORMAT(DATE(watched_on), '%Y-%m-%d')
       ORDER BY activity_date DESC
       LIMIT 365`,
      [userId],
    ),

    // Q12 — Percentile
    query<PercentileRow>(
      `SELECT
         (SELECT COUNT(DISTINCT user_id) FROM ratings) AS total_users,
         (
           SELECT COUNT(DISTINCT user_id)
           FROM ratings
           GROUP BY user_id
           HAVING COUNT(*) > (
             SELECT COUNT(*) FROM ratings WHERE user_id = ?
           )
         ) AS users_with_more_films
       FROM dual`,
      [userId],
    ),
  ]);

  // -------------------------------------------------------------------------
  // Post-processing
  // -------------------------------------------------------------------------

  // Q1 — overview
  // COUNT(*) always returns a row — non-null assertion is safe.
  const overview = overviewRows[0]!;
  const totalLogged = overview.total_logged ?? 0;

  // Q2 — minutes
  const minutes = minutesRows[0]!;
  const filmMinutes = Number(minutes.film_minutes) || 0;
  const seriesMinutes = Number(minutes.series_minutes) || 0;
  const totalMinutes = filmMinutes + seriesMinutes;

  // Q3 — reviews
  const reviewCount = reviewCountRows[0]!.review_count ?? 0;

  // Q4 — avg per week (computed from overview + optional weeks query)
  let avgPerWeek: number;
  if (period === 'month') {
    avgPerWeek = Math.round((totalLogged / 4.33) * 10) / 10;
  } else if (period === 'year') {
    avgPerWeek = Math.round((totalLogged / 52) * 10) / 10;
  } else {
    // For 'all', compute weeks from first ever watched_on.
    const [weeksRow] = await query<WeeksActiveRow>(
      `SELECT DATEDIFF(NOW(), MIN(watched_on)) / 7 AS weeks_active
       FROM ratings WHERE user_id = ?`,
      [userId],
    );
    const weeksActive = Math.max(weeksRow?.weeks_active ?? 1, 1);
    avgPerWeek = Math.round((totalLogged / weeksActive) * 10) / 10;
  }

  // Q5 — rating distribution: fill all 10 buckets
  const ALL_STAR_VALUES = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
  const distMap = new Map<number, number>();
  for (const row of distributionRows) {
    distMap.set(Number(row.value), row.count);
  }
  const ratingDistribution = ALL_STAR_VALUES.map((v) => ({
    value: v,
    count: distMap.get(v) ?? 0,
  }));

  // Q10 — calendar: merge duplicate dates (multiple backdrops per day),
  // prefer film_backdrop over series_backdrop.
  // DATE_FORMAT in the query guarantees row.date is always a string.
  const calendarMap = new Map<
    string,
    { count: number; highest_rating: number; backdrop_path: string | null }
  >();
  for (const row of calendarRows) {
    const dateStr = row.date as string;
    const existing = calendarMap.get(dateStr);
    const backdrop = row.film_backdrop ?? row.series_backdrop ?? null;
    if (!existing) {
      calendarMap.set(dateStr, {
        count: row.count,
        highest_rating: row.highest_rating,
        backdrop_path: backdrop,
      });
    } else {
      // Sum counts across all (date, backdrop) groups for the same date;
      // keep the highest rating; prefer film backdrop when available.
      calendarMap.set(dateStr, {
        count: existing.count + row.count,
        highest_rating: Math.max(existing.highest_rating, row.highest_rating),
        backdrop_path: existing.backdrop_path ?? backdrop,
      });
    }
  }
  const calendar: CalendarEntry[] = Array.from(calendarMap.entries()).map(
    ([date, val]) => ({ date, ...val }),
  );

  // Q11 — streak
  // DATE_FORMAT in the query guarantees activity_date is always a string.
  const activityDates = activityRows.map((r) => r.activity_date as string);
  const streak = computeStreak(activityDates);

  // Q12 — percentile
  const pRow = percentileRows[0];
  let percentile = 'Top 1%';
  if (pRow && pRow.total_users > 0) {
    const usersWithMore = pRow.users_with_more_films ?? 0;
    const raw = Math.round((usersWithMore / pRow.total_users) * 100);
    const clamped = Math.max(raw, 1);
    percentile = `Top ${clamped}%`;
  }

  return {
    period,
    overview: {
      total_logged: totalLogged,
      films_count: overview.films_count ?? 0,
      series_count: overview.series_count ?? 0,
      rewatch_count: overview.rewatch_count ?? 0,
      avg_rating: overview.avg_rating ?? 0,
      avg_per_week: avgPerWeek,
      review_count: reviewCount,
      percentile,
    },
    time: {
      film_minutes: filmMinutes,
      series_minutes: seriesMinutes,
      total_minutes: totalMinutes,
      total_days: Math.round((totalMinutes / 60 / 24) * 10) / 10,
    },
    rating_distribution: ratingDistribution,
    top_genres: genreRows,
    top_decades: decadeRows,
    most_watched: {
      directors: directorRows,
      actors: actorRows,
    },
    calendar,
    streak,
  };
}
