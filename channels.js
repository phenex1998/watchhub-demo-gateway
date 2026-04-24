// ============================================================================
// Curated demo channels — free-to-air public broadcasters only.
// Used by the Google Play Store review process for VouAssistirTV.
// All 8 streams validated HTTP 200 on 2026-04-24 via `curl -I`.
//
// Policy rationale (for Play Store compliance):
//   - NASA TV is U.S. federal government content (public domain).
//   - Deutsche Welle (DW) is a German federal public broadcaster.
//   - France 24 is a French public broadcaster (France Médias Monde).
//   - Red Bull TV is Red Bull GmbH's own free streaming channel.
//   - Bloomberg TV+ is Bloomberg's official ad-supported free stream.
//
// No pirated, geo-restricted commercial, or Brazilian broadcast TV streams
// are included. This list exists solely to let reviewers exercise the app's
// IPTV client capabilities with content that has no rights restrictions.
// ============================================================================

module.exports = [
  {
    id: 1,
    name: "NASA TV Public",
    category: "News",
    url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/256px-NASA_logo.svg.png",
  },
  {
    id: 2,
    name: "DW English",
    category: "News",
    url: "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Deutsche_Welle_Logo.svg/256px-Deutsche_Welle_Logo.svg.png",
  },
  {
    id: 3,
    name: "DW Deutsch",
    category: "News",
    url: "https://dwamdstream101.akamaized.net/hls/live/2015524/dwstream101/index.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Deutsche_Welle_Logo.svg/256px-Deutsche_Welle_Logo.svg.png",
  },
  {
    id: 4,
    name: "DW Espanol",
    category: "News",
    url: "https://dwamdstream104.akamaized.net/hls/live/2015530/dwstream104/index.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Deutsche_Welle_Logo.svg/256px-Deutsche_Welle_Logo.svg.png",
  },
  {
    id: 5,
    name: "France 24 English",
    category: "News",
    url: "https://static.france24.com/live/F24_EN_LO_HLS/live_web.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/FRANCE_24_logo_2024.svg/256px-FRANCE_24_logo_2024.svg.png",
  },
  {
    id: 6,
    name: "France 24 Francais",
    category: "News",
    url: "https://static.france24.com/live/F24_FR_LO_HLS/live_web.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/FRANCE_24_logo_2024.svg/256px-FRANCE_24_logo_2024.svg.png",
  },
  {
    id: 7,
    name: "Red Bull TV",
    category: "Entertainment",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/7/77/Red_Bull_Logo.svg/256px-Red_Bull_Logo.svg.png",
  },
  {
    id: 8,
    name: "Bloomberg TV",
    category: "News",
    url: "https://bloomberg.com/media-manifest/streams/us.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/New_Bloomberg_Logo.svg/256px-New_Bloomberg_Logo.svg.png",
  },
];
