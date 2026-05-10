import type {
  RecentActivityItem,
  UserFavorite,
  UserProfile,
} from '@/src/types/profile.types';

/**
 * Mock profile shown when the backend GET /users/me endpoint has not
 * yet been implemented. Mirrors the user's own profile shape so the
 * screen renders correctly during development.
 */
export const MOCK_PROFILE: UserProfile = {
  id: 1,
  username: 'alvarocrsc',
  name: 'Álvaro',
  avatar_url: null,
  bio: null,
  location: 'Spain',
  accent_color: '#1A77DA',
  profile_backdrop_tmdb_id: null,
  // Twin Peaks backdrop used in Figma — keeps the dark moody banner.
  profile_backdrop_path: '/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
  followers_count: 9,
  following_count: 5,
  films_count: 313,
  series_count: 42,
  watchlist_count: 149,
  reviews_count: 45,
  lists_count: 1,
  diary_count: 156,
  diary_this_year: 9,
  films_this_year: 7,
  series_this_year: 2,
};

export const MOCK_FAVORITES: UserFavorite[] = [
  {
    position: 1,
    film_id: 1,
    series_id: null,
    tmdb_id: 313369,
    title: 'La La Land',
    poster_path: '/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg',
    media_type: 'film',
  },
  {
    position: 2,
    film_id: null,
    series_id: 1,
    tmdb_id: 1438,
    title: 'Twin Peaks',
    poster_path: '/u3gPQ2xpzVUNs4CxDGHfBy7gOuE.jpg',
    media_type: 'series',
  },
  {
    position: 3,
    film_id: 2,
    series_id: null,
    tmdb_id: 11643,
    title: 'Vampire Hunter D',
    poster_path: '/uoVxsIQbMIDOXf4pikoLKn7HoMK.jpg',
    media_type: 'film',
  },
  {
    position: 4,
    film_id: 3,
    series_id: null,
    tmdb_id: 1064,
    title: 'Persona',
    poster_path: '/r0n4F5lXcKedyVUpSnsqZcuzn7w.jpg',
    media_type: 'film',
  },
];

export const MOCK_RECENT_ACTIVITY: RecentActivityItem[] = [
  {
    id: 1,
    rating_value: 3,
    is_rewatch: false,
    watched_on: '2025-10-31',
    tmdb_id: 22526,
    title: 'My Bloody Valentine',
    poster_path: '/lOSiUlnTyKxQa7xmDoSIVDb1Z6Z.jpg',
    media_type: 'film',
  },
  {
    id: 2,
    rating_value: 4,
    is_rewatch: false,
    watched_on: '2025-10-29',
    tmdb_id: 1100988,
    title: 'Bugonia',
    poster_path: '/qBXnPj2QjKpBfpKwPIXrgVPp7vF.jpg',
    media_type: 'film',
  },
  {
    id: 3,
    rating_value: 5,
    is_rewatch: false,
    watched_on: '2025-10-22',
    tmdb_id: 18,
    title: 'Inland Empire',
    poster_path: '/AlWGHLOmgxFJh7l0UAm3kakIVKA.jpg',
    media_type: 'film',
  },
  {
    id: 4,
    rating_value: 5,
    is_rewatch: true,
    watched_on: '2025-10-20',
    tmdb_id: 157336,
    title: 'Interstellar',
    poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    media_type: 'film',
  },
];

/** Counts indexed 0-9 corresponding to ratings 0.5, 1, 1.5, …, 5. */
export const MOCK_RATING_DISTRIBUTION: { value: number; count: number }[] = [
  { value: 0.5, count: 1 },
  { value: 1.0, count: 4 },
  { value: 1.5, count: 6 },
  { value: 2.0, count: 9 },
  { value: 2.5, count: 14 },
  { value: 3.0, count: 22 },
  { value: 3.5, count: 47 },
  { value: 4.0, count: 39 },
  { value: 4.5, count: 26 },
  { value: 5.0, count: 8 },
];
