/**
 * Static TMDB backdrop file paths used as background images for
 * the 7 stat cards on the Stats screen overview grid.
 *
 * TODO: make these dynamic — rotate based on the user's most recent
 * logged films / series — in a future update.
 */
export const STAT_CARD_BACKDROPS = {
  filmsLogged: '/8sNiAPPYU14PUepFNeSNGUTiHW.jpg', // Interstellar
  seriesLogged: '/73fH1MoISwT5sYUikAdEk6f8CM3.jpg', // Twin Peaks
  minutesWatched: '/feENbMEKRFnRvxbNdb6bfBuLZV7.jpg', // Fallen Angels
  avgPerWeek: '/sgvNKJ1opNXZuGCBiKNeeuanECU.jpg', // Dune
  avgRating: '/ik2D3KqxFD0O0Bc3Wv1CZm8sOg8.jpg', // La La Land
  reviews: '/t4y9kh5pRyVmdPbCcZ9RtDOLv6N.jpg', // Lord of the Rings
  rewatches: '/2KoWZ1hHd8leG2FDtojgeWmqdAt.jpg', // Vampire Hunter D
} as const;
