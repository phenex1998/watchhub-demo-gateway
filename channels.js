// ============================================================================
// Curated demo channels — free-to-air public/official streams only.
// Used by the Google Play Store review process for VouAssistirTV.
// All 4 streams validated HTTP 200 AND transmux-tested from Render (Oregon)
// on 2026-04-24 (first byte <400ms, stable MPEG-TS output).
//
// Policy rationale (for Play Store compliance):
//   - Deutsche Welle (DW) is a German federal public broadcaster.
//   - Red Bull TV is Red Bull GmbH's own free streaming channel.
//   - Bloomberg TV+ is Bloomberg's official ad-supported free stream.
//
// No pirated, geo-restricted commercial, or Brazilian broadcast TV streams
// are included. This list exists solely to let reviewers exercise the app's
// IPTV client capabilities with content that has no rights restrictions.
//
// Several other candidates (NASA TV, DW English, France 24, DW Arabic/Polski
// etc.) were evaluated but failed HLS sub-manifest fetches from the Render
// datacenter (Akamai geo/IP filters). The 4 kept here probe cleanly.
// ============================================================================

module.exports = [
  {
    id: 1,
    name: "DW Deutsch",
    category: "News",
    url: "https://dwamdstream101.akamaized.net/hls/live/2015524/dwstream101/index.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Deutsche_Welle_Logo.svg/256px-Deutsche_Welle_Logo.svg.png",
  },
  {
    id: 2,
    name: "DW Espanol",
    category: "News",
    url: "https://dwamdstream104.akamaized.net/hls/live/2015530/dwstream104/index.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Deutsche_Welle_Logo.svg/256px-Deutsche_Welle_Logo.svg.png",
  },
  {
    id: 3,
    name: "Red Bull TV",
    category: "Entertainment",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/7/77/Red_Bull_Logo.svg/256px-Red_Bull_Logo.svg.png",
  },
  {
    id: 4,
    name: "Bloomberg TV",
    category: "News",
    url: "https://bloomberg.com/media-manifest/streams/us.m3u8",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/New_Bloomberg_Logo.svg/256px-New_Bloomberg_Logo.svg.png",
  },
];
