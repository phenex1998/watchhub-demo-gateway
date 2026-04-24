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

// ---------------------------------------------------------------------------
// Health endpoint (Render.com uses this)
// ---------------------------------------------------------------------------

app.get("/health", (_req, res) => {
  res.json({ ok: true, channels: CHANNELS.length, ts: nowUnix() });
});

app.get("/", (_req, res) => {
  res.type("text/plain").send(
    `watchhub-demo-gateway\nchannels: ${CHANNELS.length}\nhealthy: /health`,
  );
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

    // VOD and Series: empty — this gateway only serves live channels.
    case "get_vod_categories":
    case "get_vod_streams":
    case "get_series_categories":
    case "get_series":
      return res.json([]);

    case "get_vod_info":
    case "get_series_info":
      return res.json({});

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

  // Spawn ffmpeg. stdout -> response stream.
  const ff = spawn(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel", "error",
      "-user_agent", "VouAssistirTV-Demo/1.0",
      "-reconnect", "1",
      "-reconnect_at_eof", "1",
      "-reconnect_streamed", "1",
      "-reconnect_delay_max", "5",
      "-i", channel.url,
      "-map", "0:v:0?",
      "-map", "0:a:0?",
      "-c", "copy",
      "-f", "mpegts",
      "-muxdelay", "0",
      "-flush_packets", "1",
      "pipe:1",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

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
