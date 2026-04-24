// ============================================================================
// VOD + Series catalog for the Xtream demo gateway.
//
// All content is Creative Commons (CC BY 3.0) produced and released by the
// Blender Foundation. No copyright risk whatsoever for Play Store review.
//
// Source: https://peach.blender.org / https://durian.blender.org
// Hosted copies on Archive.org (serves HTTP 206 range requests — the app's
// ProgressiveMediaSource needs range support for MP4 seeking).
//
// IDs use 10xx for movies and 20xx/30xx for series/episodes to avoid any
// collision with the live channels (which use 1..4).
// ============================================================================

const MOVIES = [
  {
    stream_id: 1001,
    name: "Big Buck Bunny",
    category_id: "10",
    container_extension: "mp4",
    upstream:
      "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4",
    cover:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big.Buck.Bunny.-.Opening.Screen.png/512px-Big.Buck.Bunny.-.Opening.Screen.png",
    plot:
      "Big Buck Bunny tells the story of a giant rabbit with a heart bigger than himself. When one sunny day three rodents rudely harass him, something awakens in his soul — nature kicks back. (Creative Commons CC BY 3.0 short film, Blender Foundation, 2008.)",
    duration: "00:09:56",
    release_date: "2008-04-10",
    rating: "8.0",
    director: "Sacha Goedegebure",
    genre: "Animation, Comedy, Short",
  },
];

const MOVIE_CATEGORIES = [
  {
    category_id: "10",
    category_name: "Blender Open Movies (CC BY)",
    parent_id: 0,
  },
];

const SERIES = [
  {
    series_id: 2001,
    name: "Open Source Short Films",
    category_id: "20",
    cover:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Sintel_poster.jpg/512px-Sintel_poster.jpg",
    plot:
      "A collection of Creative Commons short films produced by the Blender Foundation to demonstrate open-source animation capabilities.",
    release_date: "2010-09-27",
    rating: "9.0",
    director: "Various",
    genre: "Animation, Short",
    seasons: [
      {
        season_number: 1,
        name: "Season 1",
        episode_count: 1,
        cover: null,
        overview: "Blender Foundation short films, CC BY 3.0.",
      },
    ],
    episodes: {
      // Xtream schema: episodes is a map keyed by season_number (as string).
      "1": [
        {
          id: 3001, // episode stream_id (used by /series/{user}/{pass}/{id}.{ext})
          episode_num: 1,
          season: 1,
          title: "Sintel",
          container_extension: "mp4",
          upstream:
            "https://archive.org/download/Sintel/sintel-2048-stereo_512kb.mp4",
          info: {
            plot:
              "A lonely young woman befriends a baby dragon she names Scales. When Scales is taken from her, Sintel embarks on a perilous quest to find him. (Creative Commons CC BY 3.0, Blender Foundation, 2010.)",
            duration: "00:14:48",
            rating: "8.2",
            release_date: "2010-09-27",
            movie_image:
              "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Sintel_poster.jpg/256px-Sintel_poster.jpg",
          },
        },
      ],
    },
  },
];

const SERIES_CATEGORIES = [
  {
    category_id: "20",
    category_name: "Blender Open Movies (CC BY)",
    parent_id: 0,
  },
];

/** Find a movie by stream_id. */
function findMovie(streamId) {
  return MOVIES.find((m) => m.stream_id === Number(streamId));
}

/** Find an episode across all series by its episode id. */
function findEpisode(episodeId) {
  const id = Number(episodeId);
  for (const series of SERIES) {
    for (const season of Object.keys(series.episodes)) {
      for (const ep of series.episodes[season]) {
        if (ep.id === id) return { series, season, episode: ep };
      }
    }
  }
  return null;
}

module.exports = {
  MOVIES,
  MOVIE_CATEGORIES,
  SERIES,
  SERIES_CATEGORIES,
  findMovie,
  findEpisode,
};
