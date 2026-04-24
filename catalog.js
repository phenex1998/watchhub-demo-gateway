// ============================================================================
// VOD + Series catalog for the Xtream demo gateway.
//
// Policy: STRICTLY Public Domain or Creative Commons. 100% of the content
// here is Blender Foundation short films, licensed Creative Commons
// Attribution 3.0 (CC BY 3.0). No commercial studio releases, no
// copyrighted broadcast content.
//
// Cover images come from archive.org (/download/<item>/__ia_thumb.jpg)
// which is a stable, always-available auto-generated thumbnail endpoint.
// Previous experiment with upload.wikimedia.org URLs returned HTTP 400 --
// avoid wikimedia thumbnails in production catalogs.
//
// IDs use 10xx for movies and 20xx/30xx for series/episodes to keep them
// disjoint from the live channels (1..2).
// ============================================================================

const MOVIES = [
  {
    stream_id: 1001,
    name: "Big Buck Bunny",
    category_id: "10",
    container_extension: "mp4",
    upstream:
      "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4",
    cover: "https://archive.org/download/BigBuckBunny_124/__ia_thumb.jpg",
    plot:
      "Big Buck Bunny tells the story of a giant rabbit with a heart bigger than himself. When one sunny day three rodents rudely harass him, something awakens in his soul — nature kicks back. (Creative Commons CC BY 3.0 short film, Blender Foundation, 2008.)",
    duration: "00:09:56",
    release_date: "2008-04-10",
    rating: "8.0",
    director: "Sacha Goedegebure",
    genre: "Animation, Comedy, Short",
  },
  {
    stream_id: 1002,
    name: "Sintel",
    category_id: "10",
    container_extension: "mp4",
    upstream:
      "https://archive.org/download/Sintel/sintel-2048-stereo_512kb.mp4",
    cover: "https://archive.org/download/Sintel/__ia_thumb.jpg",
    plot:
      "A lonely young woman befriends a baby dragon she names Scales. When Scales is taken from her, Sintel embarks on a perilous quest to find him. (Creative Commons CC BY 3.0, Blender Foundation, 2010.)",
    duration: "00:14:48",
    release_date: "2010-09-27",
    rating: "8.2",
    director: "Colin Levy",
    genre: "Animation, Fantasy, Short",
  },
  {
    stream_id: 1003,
    name: "Elephants Dream",
    category_id: "10",
    container_extension: "mp4",
    upstream: "https://archive.org/download/ElephantsDream/ed_1024.mp4",
    cover: "https://archive.org/download/ElephantsDream/__ia_thumb.jpg",
    plot:
      "Two strange characters explore a capricious and seemingly infinite machine. The elder tries to convince the younger of its wonders, but he has his own ideas. The world's first open movie. (Creative Commons CC BY 3.0, Blender Foundation, 2006.)",
    duration: "00:10:53",
    release_date: "2006-05-18",
    rating: "7.2",
    director: "Bassam Kurdali",
    genre: "Animation, Surreal, Short",
  },
  {
    stream_id: 1004,
    name: "Tears of Steel",
    category_id: "10",
    container_extension: "mp4",
    upstream:
      "https://archive.org/download/tears-of-steel_202504/Tears%20of%20Steel.mp4",
    cover:
      "https://archive.org/download/tears-of-steel_202504/__ia_thumb.jpg",
    plot:
      "A group of resistance fighters tries to prevent the robot apocalypse from taking over Amsterdam. Live-action short with VFX showcasing Blender's compositing pipeline. (Creative Commons CC BY 3.0, Blender Foundation, 2012.)",
    duration: "00:12:14",
    release_date: "2012-09-26",
    rating: "7.5",
    director: "Ian Hubert",
    genre: "Sci-Fi, Short, Action",
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
    name: "Blender Open Movies",
    category_id: "20",
    cover: "https://archive.org/download/Sintel/__ia_thumb.jpg",
    plot:
      "A collection of Creative Commons short films produced by the Blender Foundation. Each episode is a complete standalone film demonstrating open-source animation pipelines from 2006 to 2012.",
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
        overview: "Selected Blender Foundation shorts, CC BY 3.0.",
      },
    ],
    episodes: {
      "1": [
        {
          id: 3001,
          episode_num: 1,
          season: 1,
          title: "Sintel",
          container_extension: "mp4",
          upstream:
            "https://archive.org/download/Sintel/sintel-2048-stereo_512kb.mp4",
          info: {
            plot:
              "A lonely young woman befriends a baby dragon. When he is taken from her, she embarks on a perilous quest to find him. (CC BY 3.0, Blender Foundation, 2010.)",
            duration: "00:14:48",
            rating: "8.2",
            release_date: "2010-09-27",
            movie_image:
              "https://archive.org/download/Sintel/__ia_thumb.jpg",
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
