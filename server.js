// ============================================================================
// watchhub-demo-gateway
// ----------------------------------------------------------------------------
// Minimal Xtream Codes API gateway that exposes a curated list of free-to-air
// public broadcasters as if they were channels on an Xtream IPTV server.
//
// VouAssistirTV (the Android TV app) talks Xtream natively and constructs live
// stream URLs as `$server/live/$user/$pass/$streamId.ts` (hardcoded `.ts`
// extension in StreamUrlBuilder.kt). Most public broadcasters only publish HLS
// (`.m3u8`), so this gateway transmuxes HLS -> MPEG-TS on the fly with ffmpeg
// (-c copy, zero re-encode, low CPU) and pipes it to the client.
//
// Intended purpose: Google Play Store review credential. Reviewers log in with
// code=PLAYSTORE, user=demo, pass=demo and see 8 legal channels.
//
// DO NOT USE this gateway for general consumer traffic — it is a demo bridge,
// not a scalable service. Expected load: 1-2 concurrent streams during review.
// ============================================================================

const express = require("express");
const { spawn } = require("child_process");
const CHANNELS = require("./channels");
const {
  MOVIES,
  MOVIE_CATEGORIES,
  SERIES,
  SERIES_CATEGORIES,
  findMovie,
  findEpisode,
} = require("./catalog");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DEMO_USER = process.env.DEMO_USER || "demo";
const DEMO_PASS = process.env.DEMO_PASS || "demo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

function authOk(req) {
  const u = req.query.username ?? req.params.user;
  const p = req.query.password ?? req.params.pass;
  return u === DEMO_USER && p === DEMO_PASS;
}

function liveStreamShape(channel) {
  return {
    num: channel.id,
    name: channel.name,
    stream_type: "live",
    stream_id: channel.id,
    stream_icon: channel.logo || "",
    epg_channel_id: "",
    added: String(nowUnix()),
    category_id: "1",
    custom_sid: "",
    tv_archive: 0,
    direct_source: "",
    tv_archive_duration: 0,
  };
}

function vodStreamShape(movie) {
  return {
    num: movie.stream_id,
    name: movie.name,
    stream_type: "movie",
    stream_id: movie.stream_id,
    stream_icon: movie.cover || "",
    rating: movie.rating ?? "",
    rating_5based: movie.rating ? Number(movie.rating) / 2 : 0,
    added: String(nowUnix()),
    category_id: movie.category_id,
    container_extension: movie.container_extension,
    custom_sid: "",
    direct_source: "",
  };
}

function seriesListShape(series) {
  return {
    num: series.series_id,
    name: series.name,
    series_id: series.series_id,
    cover: series.cover || "",
    plot: series.plot || "",
    cast: "",
    director: series.director || "",
    genre: series.genre || "",
    releaseDate: series.release_date || "",
    last_modified: String(nowUnix()),
    rating: series.rating ?? "",
    rating_5based: series.rating ? Number(series.rating) / 2 : 0,
    backdrop_path: [],
    youtube_trailer: "",
    episode_run_time: "15",
    category_id: series.category_id,
  };
}

// ---------------------------------------------------------------------------
// Health endpoint (Render.com uses this)
// ---------------------------------------------------------------------------

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    channels: CHANNELS.length,
    movies: MOVIES.length,
    series: SERIES.length,
    ts: nowUnix(),
  });
});

app.get("/", (_req, res) => {
  res.type("text/plain").send(
    `watchhub-demo-gateway\n` +
      `channels: ${CHANNELS.length}\n` +
      `movies: ${MOVIES.length}\n` +
      `series: ${SERIES.length}\n` +
      `healthy: /health`,
  );
});

// ---------------------------------------------------------------------------
// Debug endpoints -- remover em producao quando transmux estiver estavel
// ---------------------------------------------------------------------------

app.get("/debug/ffmpeg", (_req, res) => {
  const ff = spawn("ffmpeg", ["-version"]);
  let out = "";
  ff.stdout.on("data", (b) => { out += b.toString(); });
  ff.stderr.on("data", (b) => { out += b.toString(); });
  ff.on("error", (err) => {
    res.status(500).type("text/plain")
      .send(`spawn error: ${err.code} ${err.message}\nffmpeg nao instalado?`);
  });
  ff.on("exit", (code) => {
    res.type("text/plain").send(`exit=${code}\n${out.slice(0, 2000)}`);
  });
});

app.get("/debug/probe/:id", (req, res) => {
  const channel = CHANNELS.find((c) => c.id === Number(req.params.id));
  if (!channel) return res.status(404).send("channel not found");

  // Roda ffmpeg 5s contra o upstream e reporta stdout bytes + stderr.
  const ff = spawn("ffmpeg", [
    "-hide_banner", "-loglevel", "info",
    "-user_agent", "VouAssistirTV-Demo/1.0",
    "-i", channel.url,
    "-t", "5",
    "-c", "copy",
    "-f", "mpegts",
    "pipe:1",
  ]);

  let stdoutBytes = 0;
  let stderr = "";
  ff.stdout.on("data", (b) => { stdoutBytes += b.length; });
  ff.stderr.on("data", (b) => { stderr += b.toString(); });
  ff.on("error", (err) => {
    res.status(500).json({ spawn_error: String(err) });
  });
  ff.on("exit", (code, signal) => {
    res.json({
      channel: channel.name,
      upstream: channel.url,
      ffmpeg_exit: code,
      ffmpeg_signal: signal,
      stdout_bytes: stdoutBytes,
      stderr_tail: stderr.slice(-2000),
    });
  });

  // Safety net -- 30s max
  setTimeout(() => {
    try { ff.kill("SIGKILL"); } catch { /* noop */ }
  }, 30000);
});

// ---------------------------------------------------------------------------
// Xtream Codes API
// ---------------------------------------------------------------------------

app.get("/player_api.php", (req, res) => {
  const action = String(req.query.action ?? "");

  // No action = authentication + server info (this is how Xtream clients test
  // credentials before loading anything else).
  if (!action) {
    if (!authOk(req)) {
      return res.json({ user_info: { auth: 0 } });
    }
    return res.json({
      user_info: {
        username: DEMO_USER,
        password: DEMO_PASS,
        message: "",
        auth: 1,
        status: "Active",
        is_trial: "0",
        active_cons: "0",
        max_connections: "2",
        allowed_output_formats: ["m3u8", "ts"],
        exp_date: String(nowUnix() + 365 * 86400),
        created_at: String(nowUnix() - 86400),
      },
      server_info: {
        url: req.hostname,
        port: "443",
        https_port: "443",
        server_protocol: "https",
        rtmp_port: "",
        timezone: "UTC",
        timestamp_now: nowUnix(),
        time_now: new Date().toISOString().replace("T", " ").slice(0, 19),
      },
    });
  }

  // Everything below requires valid credentials.
  if (!authOk(req)) {
    return res.status(401).json({ user_info: { auth: 0 } });
  }

  switch (action) {
    case "get_live_categories":
      return res.json([
        { category_id: "1", category_name: "Demo (free-to-air)", parent_id: 0 },
      ]);

    case "get_live_streams": {
      // Optional category filter — only one category exists, so either
      // matches "1" or returns all.
      const catId = req.query.category_id;
      const list = CHANNELS.map(liveStreamShape);
      if (catId && String(catId) !== "1") return res.json([]);
      return res.json(list);
    }

    // VOD catalog (L27: CC BY content from Blender Foundation)
    case "get_vod_categories":
      return res.json(MOVIE_CATEGORIES);

    case "get_vod_streams": {
      const catId = req.query.category_id;
      const list = MOVIES.map(vodStreamShape);
      if (catId && !MOVIES.some((m) => m.category_id === String(catId))) {
        return res.json([]);
      }
      return res.json(
        catId
          ? list.filter((m) => m.category_id === String(catId))
          : list,
      );
    }

    case "get_vod_info": {
      const id = Number(req.query.vod_id);
      const m = findMovie(id);
      if (!m) return res.json({});
      return res.json({
        info: {
          movie_image: m.cover || "",
          tmdb_id: "",
          backdrop_path: [],
          youtube_trailer: "",
          genre: m.genre || "",
          plot: m.plot || "",
          cast: "",
          rating: m.rating ?? "",
          director: m.director || "",
          releasedate: m.release_date || "",
          duration: m.duration || "",
          duration_secs: 0,
        },
        movie_data: {
          stream_id: m.stream_id,
          name: m.name,
          added: String(nowUnix()),
          category_id: m.category_id,
          container_extension: m.container_extension,
          custom_sid: "",
          direct_source: "",
        },
      });
    }

    // Series catalog
    case "get_series_categories":
      return res.json(SERIES_CATEGORIES);

    case "get_series": {
      const catId = req.query.category_id;
      const list = SERIES.map(seriesListShape);
      return res.json(
        catId
          ? list.filter((s) => s.category_id === String(catId))
          : list,
      );
    }

    case "get_series_info": {
      const sid = Number(req.query.series_id);
      const s = SERIES.find((x) => x.series_id === sid);
      if (!s) return res.json({});
      // Xtream shape: { info, seasons, episodes: { "1": [{...}] } }
      const episodesOut = {};
      for (const seasonKey of Object.keys(s.episodes)) {
        episodesOut[seasonKey] = s.episodes[seasonKey].map((ep) => ({
          id: ep.id,
          episode_num: ep.episode_num,
          title: ep.title,
          container_extension: ep.container_extension,
          info: ep.info || {},
          custom_sid: "",
          added: String(nowUnix()),
          season: ep.season,
          direct_source: "",
        }));
      }
      return res.json({
        seasons: s.seasons.map((sn) => ({
          air_date: s.release_date || "",
          episode_count: sn.episode_count,
          id: sn.season_number,
          name: sn.name,
          overview: sn.overview || "",
          season_number: sn.season_number,
          cover: sn.cover || s.cover || "",
          cover_big: s.cover || "",
        })),
        info: {
          name: s.name,
          cover: s.cover || "",
          plot: s.plot || "",
          cast: "",
          director: s.director || "",
          genre: s.genre || "",
          releaseDate: s.release_date || "",
          last_modified: String(nowUnix()),
          rating: s.rating ?? "",
          rating_5based: s.rating ? Number(s.rating) / 2 : 0,
          backdrop_path: [],
          youtube_trailer: "",
          episode_run_time: "15",
          category_id: s.category_id,
        },
        episodes: episodesOut,
      });
    }

    // EPG endpoints: return empty arrays (the app handles missing EPG
    // gracefully — just shows "Sem programacao").
    case "get_short_epg":
    case "get_simple_data_table":
      return res.json({ epg_listings: [] });

    default:
      // Unknown action — return empty array for maximum compatibility.
      return res.json([]);
  }
});

// ---------------------------------------------------------------------------
// Live stream endpoint — HLS -> MPEG-TS transmux via ffmpeg
// ---------------------------------------------------------------------------
// Path format: /live/{user}/{pass}/{streamId}.ts
//
// Why transmux (and not redirect):
//   The Android TV app's MediaSourceFactory inspects the URL extension to
//   decide which media source to build (HLS vs Progressive). A 302 redirect
//   to `.m3u8` would arrive AFTER the app has already chosen Progressive, so
//   it would fail to play. Transmuxing keeps the client's expected `.ts`
//   contract without the app needing any change.
//
// -c copy: no transcoding. CPU cost is minimal (~2-5% per 720p stream).
// The container is rewritten to fragmented MPEG-TS on the fly.
// ---------------------------------------------------------------------------

app.get("/live/:user/:pass/:streamId.ts", (req, res) => {
  if (!authOk(req)) return res.status(401).end();

  const id = Number(req.params.streamId);
  const channel = CHANNELS.find((c) => c.id === id);
  if (!channel) return res.status(404).end();

  console.log(
    `[stream] ${channel.name} (id=${id}) -> ${req.ip ?? "?"} -- ua=${req.headers["user-agent"] ?? "?"}`,
  );

  res.setHeader("Content-Type", "video/mp2t");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Connection", "keep-alive");
  // Flush headers IMEDIATAMENTE -- sem isso o Render/Cloudflare pode
  // esperar o primeiro byte antes de enviar headers ao cliente, e se o
  // ffmpeg demorar >30s pra primeiro byte o client abre timeout.
  res.flushHeaders?.();

  // Spawn ffmpeg. stdout -> response. Comando minimalista:
  //   -re                   ler em tempo real (evita saturar CPU)
  //   -c copy               zero transcoding (muito barato em CPU)
  //   -f mpegts             container MPEG-TS
  //   -reconnect*           aguenta reconnect do upstream sem morrer
  const ff = spawn(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel", "warning",
      "-user_agent", "VouAssistirTV-Demo/1.0",
      "-reconnect", "1",
      "-reconnect_streamed", "1",
      "-reconnect_delay_max", "4",
      "-i", channel.url,
      "-c", "copy",
      "-f", "mpegts",
      "pipe:1",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  // Log quando o primeiro byte sai -- ajuda diagnosticar cold starts lentos.
  let firstByteLogged = false;
  ff.stdout.once("data", () => {
    console.log(`[stream] ${channel.name} first byte OK`);
    firstByteLogged = true;
  });

  let killed = false;
  const cleanup = (reason) => {
    if (killed) return;
    killed = true;
    try { ff.kill("SIGKILL"); } catch { /* noop */ }
    console.log(`[stream] ${channel.name} closed (${reason})`);
  };

  ff.stdout.pipe(res, { end: false });

  ff.stderr.on("data", (buf) => {
    const msg = buf.toString().trim();
    if (msg) console.error(`[ffmpeg ${channel.name}] ${msg.slice(0, 400)}`);
  });

  ff.on("exit", (code, signal) => {
    cleanup(`ffmpeg exit code=${code} signal=${signal}`);
    if (!res.writableEnded) res.end();
  });

  ff.on("error", (err) => {
    console.error(`[ffmpeg ${channel.name}] spawn error:`, err.message);
    cleanup("spawn error");
    if (!res.headersSent) res.status(500).end();
  });

  req.on("close", () => cleanup("client closed"));
  res.on("close", () => cleanup("response closed"));
});

// ---------------------------------------------------------------------------
// VOD endpoint -- MP4 direct from upstream (no transmux).
// App URL pattern: /movie/{user}/{pass}/{streamId}.{ext}
// ExoPlayer follows 302 redirects and reads MP4 via HTTP range requests.
// ---------------------------------------------------------------------------

app.get("/movie/:user/:pass/:file", (req, res) => {
  if (!authOk(req)) return res.status(401).end();
  // :file is "<id>.<ext>"; strip the extension to get the id
  const id = Number(String(req.params.file).split(".")[0]);
  const movie = findMovie(id);
  if (!movie) return res.status(404).end();
  console.log(`[movie] ${movie.name} (id=${id}) -> redirect to upstream`);
  res.redirect(302, movie.upstream);
});

// ---------------------------------------------------------------------------
// Series episode endpoint -- MP4 direct from upstream.
// App URL pattern: /series/{user}/{pass}/{episodeId}.{ext}
// ---------------------------------------------------------------------------

app.get("/series/:user/:pass/:file", (req, res) => {
  if (!authOk(req)) return res.status(401).end();
  const id = Number(String(req.params.file).split(".")[0]);
  const hit = findEpisode(id);
  if (!hit) return res.status(404).end();
  console.log(
    `[episode] ${hit.series.name} S${hit.season}E${hit.episode.episode_num} (id=${id})`,
  );
  res.redirect(302, hit.episode.upstream);
});

// ---------------------------------------------------------------------------
// Optional HLS endpoint for generic clients (not used by the Android app,
// but handy for testing from VLC / browser).
// ---------------------------------------------------------------------------

app.get("/live/:user/:pass/:streamId.m3u8", (req, res) => {
  if (!authOk(req)) return res.status(401).end();
  const id = Number(req.params.streamId);
  const channel = CHANNELS.find((c) => c.id === id);
  if (!channel) return res.status(404).end();
  // Direct 302 -- HLS clients follow redirects natively.
  res.redirect(302, channel.url);
});

// ---------------------------------------------------------------------------
// Public M3U playlist -- optional, useful for debugging.
// ---------------------------------------------------------------------------

app.get("/get.php", (req, res) => {
  if (!authOk(req)) return res.status(401).type("text/plain").send("unauthorized");
  const base = `${req.protocol}://${req.get("host")}`;
  const lines = ["#EXTM3U"];
  for (const c of CHANNELS) {
    lines.push(
      `#EXTINF:-1 tvg-id="${c.id}" tvg-logo="${c.logo || ""}" group-title="${c.category}",${c.name}`,
    );
    lines.push(`${base}/live/${DEMO_USER}/${DEMO_PASS}/${c.id}.ts`);
  }
  res.type("application/vnd.apple.mpegurl").send(lines.join("\n"));
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `watchhub-demo-gateway listening on :${PORT} with ${CHANNELS.length} channels`,
  );
});
