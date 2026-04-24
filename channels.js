// ============================================================================
// Live channels for the Xtream demo gateway.
//
// Policy: STRICTLY Public Domain or Creative Commons content only.
// Every asset here is Blender Foundation short film, Creative Commons
// Attribution 3.0 (CC BY 3.0). No commercial broadcaster, no copyrighted
// material, no regional/rights-restricted content.
//
// Source notes:
//   - NASA TV Public Channel was discontinued by NASA in 2024 in favor of
//     NASA+ (proprietary streaming platform). The legacy Akamai endpoint
//     still serves master.m3u8 but all sub-manifests return 404. iptv-org
//     (largest public catalog) no longer lists an NASA TV live URL.
//   - The Akamai CPH test stream proposed as a substitute has the same
//     issue (master responds, sub-manifests 404).
//   - livepush.io and unified-streaming.com host canonical CC BY samples
//     used by the streaming industry for client testing. Validated
//     end-to-end: master + all sub-variants + first segment return 200.
// ============================================================================

module.exports = [
  {
    id: 1,
    name: "Big Buck Bunny (Live)",
    category: "Blender Open Movies (CC BY)",
    url: "https://live-par-2-abr.livepush.io/vod/bigbuckbunny/playlist.m3u8",
    logo: "https://archive.org/download/BigBuckBunny_124/__ia_thumb.jpg",
  },
  {
    id: 2,
    name: "Tears of Steel (Live)",
    category: "Blender Open Movies (CC BY)",
    url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
    logo: "https://archive.org/download/tears-of-steel_202504/__ia_thumb.jpg",
  },
];
