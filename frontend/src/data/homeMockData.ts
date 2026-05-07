/**
 * Mock data for the Home screen. Used while real API hooks are being wired up.
 */

export interface FriendActivity {
  id: number;
  posterPath: string | null;
  filmTitle: string;
  username: string;
  userId: number;
  avatarUrl: string | null;
  rating: number;
  ratingId: number;
}

export interface DividesEntry {
  id: number;
  posterPath: string | null;
  title: string;
  negativePercent: number;
  positivePercent: number;
  worstRating: number;
  bestRating: number;
  worstAvatarUrl: string | null;
  bestAvatarUrl: string | null;
  friendCount: number;
  ratingSpread: number;
}

export const MOCK_FRIENDS_ACTIVITY: FriendActivity[] = [
  {
    id: 1,
    posterPath: '/jSziioSwPVrOy9Yow3XhWIBDjq1.jpg',
    filmTitle: 'Fight Club',
    username: 'amestris',
    userId: 2,
    avatarUrl: null,
    rating: 4.5,
    ratingId: 1,
  },
  {
    id: 2,
    posterPath: '/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg',
    filmTitle: 'Pulp Fiction',
    username: 'deeimos',
    userId: 3,
    avatarUrl: null,
    rating: 5,
    ratingId: 2,
  },
  {
    id: 3,
    posterPath: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    filmTitle: 'Interstellar',
    username: 'rt16',
    userId: 4,
    avatarUrl: null,
    rating: 4,
    ratingId: 3,
  },
  {
    id: 4,
    posterPath: '/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg',
    filmTitle: 'Inception',
    username: 'carvajal',
    userId: 5,
    avatarUrl: null,
    rating: 4.5,
    ratingId: 4,
  },
];

export const MOCK_DIVIDES: DividesEntry[] = [
  {
    id: 1,
    posterPath: '/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg', // Dune: Part Two
    title: 'Dune: Part Two',
    negativePercent: 0.27,
    positivePercent: 0.70,
    worstRating: 1.5,
    bestRating: 5.0,
    worstAvatarUrl: null,
    bestAvatarUrl: null,
    friendCount: 6,
    ratingSpread: 2.5,
  },
  {
    id: 2,
    posterPath: '/ikcNOWB6Qo1ER1H1BJL6Vf0W22s.jpg', // The Drama
    title: 'The Drama',
    negativePercent: 0.20,
    positivePercent: 0.75,
    worstRating: 2.0,
    bestRating: 5.0,
    worstAvatarUrl: null,
    bestAvatarUrl: null,
    friendCount: 8,
    ratingSpread: 3.0,
  },
  {
    id: 3,
    posterPath: '/7LEI8ulZzO5gy9Ww2NVCrKmHeDZ.jpg', // Midsommar
    title: 'Midsommar',
    negativePercent: 0.45,
    positivePercent: 0.55,
    worstRating: 1.0,
    bestRating: 4.5,
    worstAvatarUrl: null,
    bestAvatarUrl: null,
    friendCount: 5,
    ratingSpread: 3.5,
  },
  {
    id: 4,
    posterPath: '/f1tIYarTbkBdIT1aW0gzelDwknv.jpg', // The Lighthouse
    title: 'The Lighthouse',
    negativePercent: 0.38,
    positivePercent: 0.62,
    worstRating: 1.5,
    bestRating: 5.0,
    worstAvatarUrl: null,
    bestAvatarUrl: null,
    friendCount: 4,
    ratingSpread: 3.5,
  },
];
