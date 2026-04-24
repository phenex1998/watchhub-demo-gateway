# watchhub-demo-gateway

Minimal Xtream Codes API gateway used exclusively as the **Google Play Store
review credential** for the VouAssistirTV Android TV app. Exposes 8 curated
free-to-air public broadcasters (NASA TV, DW, France 24, Red Bull TV,
Bloomberg) as if they were channels on an Xtream IPTV server, transmuxing
HLS to MPEG-TS on the fly via ffmpeg.

## Why this exists

The VouAssistirTV app speaks Xtream Codes natively and constructs live stream
URLs as `$server/live/$user/$pass/$streamId.ts`. To let Play Store reviewers
log in and see content without exposing our commercial IPTV backend, we point
the app at this gateway using a dedicated demo reseller/access_code.

This gateway serves **only** legal, publicly-licensed streams. No pirated
broadcasts, no geo-restricted commercial content. See
[`channels.js`](./channels.js) for the full list and policy rationale.

## Local run

Requires Node 18+ and ffmpeg installed on PATH.

```bash
npm install
npm start
# -> :3000
```

Test in VLC:

```
Media -> Open Network Stream ->
http://localhost:3000/live/demo/demo/1.ts
```

Or fetch the M3U playlist:

```bash
curl http://localhost:3000/get.php?username=demo&password=demo
```

## Deploy to Render.com (recommended)

1. Create a GitHub repo from this folder:

   ```bash
   cd watchhub-demo-gateway
   git init
   git add .
   git commit -m "Initial: Xtream demo gateway for Play Store review"
   git branch -M main
   git remote add origin git@github.com:<your-user>/watchhub-demo-gateway.git
   git push -u origin main
   ```

2. On [render.com](https://render.com):
   - New -> **Blueprint** -> point to the GitHub repo.
   - Render auto-detects [`render.yaml`](./render.yaml) and provisions a
     free-tier Docker web service.
   - Wait ~3 min for the first build.

3. Note the public URL (e.g. `https://watchhub-demo-gateway-xxxx.onrender.com`).

4. Test from anywhere:

   ```bash
   curl https://watchhub-demo-gateway-xxxx.onrender.com/health
   # -> {"ok":true,"channels":8,"ts":1776...}
   ```

### Free tier caveats

- Service spins down after **15 minutes idle**. First request after idle has
  ~30s cold start (ffmpeg process starts fast, Node boot is the slow part).
- 512 MB RAM, shared CPU. Plenty for 2-3 concurrent reviewers. For higher
  load, bump to a paid plan (~$7/mo).

## Configure the Android TV app to use this gateway

1. Log in to the admin panel (`painel.watchhub.me`) as **admin**.
2. Navigate to **Servers** -> **New Server**:
   - Name: `Playstore Demo`
   - DNS: `https://watchhub-demo-gateway-xxxx.onrender.com` (paste the Render URL)
   - Xtream username: `demo`
   - Xtream password: `demo`
3. Navigate to **Resellers** -> create `Playstore Review` reseller (or reuse one).
4. Navigate to **Codes** -> **New Code**:
   - Code: `PLAYSTORE` (or any string you'll paste into Play Console)
   - Server: `Playstore Demo`
   - Max clients: `5`
5. Test on a real Android TV (or emulator):
   - Code: `PLAYSTORE`
   - User: `demo`
   - Pass: `demo`
   - You should see a single "Demo (free-to-air)" category with 8 channels.

## Xtream endpoints implemented

| Endpoint | Behavior |
|---|---|
| `GET /player_api.php?username=X&password=Y` | Returns `user_info` + `server_info`. `auth=1` only if credentials match. |
| `GET /player_api.php?...&action=get_live_categories` | Single category: "Demo (free-to-air)". |
| `GET /player_api.php?...&action=get_live_streams` | All 8 channels. |
| `GET /player_api.php?...&action=get_vod_*` | Empty array (no VOD). |
| `GET /player_api.php?...&action=get_series*` | Empty array (no series). |
| `GET /player_api.php?...&action=get_short_epg&stream_id=X` | Empty EPG (graceful fallback in the app). |
| `GET /live/{user}/{pass}/{streamId}.ts` | ffmpeg transmux HLS -> MPEG-TS, piped to client. |
| `GET /live/{user}/{pass}/{streamId}.m3u8` | 302 redirect to upstream HLS (for browser/VLC testing). |
| `GET /get.php?username=X&password=Y` | M3U playlist for generic clients. |
| `GET /health` | `{ok: true, channels: N}` |

## Architecture

```
  Android TV app (Media3 ExoPlayer)
      |
      | GET /player_api.php?username=demo&password=demo&action=get_live_streams
      v
  watchhub-demo-gateway (Node/Express)
      |
      | returns JSON with 8 channels
      |
      | GET /live/demo/demo/1.ts
      v
  spawn ffmpeg -i <upstream HLS> -c copy -f mpegts pipe:1
      |
      | MPEG-TS bytes -> HTTP response
      v
  ExoPlayer ProgressiveMediaSource -> playback
```

## Costs

- Render free tier: **$0/month**.
- Traffic: negligible (Play Store review typically ≤ 5 minutes of streaming
  across ≤ 10 testers).
- Can be deleted after Play Store approval if you don't want to keep it
  running. Just revoke the `PLAYSTORE` code in the admin panel first.

## License

UNLICENSED. Internal tooling only. The gateway code itself is MIT-spirit
(tiny, no secrets) but since it proxies third-party streams we keep it
private to avoid doubt.
