import { isHostOf, type ChannelKind } from "./channels";

const YOUTUBE_VIDEO_ID = /^[\w-]{11}$/;
const YOUTUBE_CHANNEL_ID = /^UC[\w-]{22}$/;
const DAILYMOTION_VIDEO_ID = /^[a-z0-9]+$/i;
const TWITCH_CHANNEL = /^\w{3,25}$/;
const TWITCH_VIDEO_ID = /^\d+$/;

function youtubeEmbed(url: URL) {
  const segments = url.pathname.split("/").filter(Boolean);

  const videoId =
    url.hostname === "youtu.be"
      ? segments[0]
      : segments[0] === "watch"
        ? url.searchParams.get("v")
        : ["live", "embed"].includes(segments[0] ?? "")
          ? segments[1]
          : null;
  if (videoId && YOUTUBE_VIDEO_ID.test(videoId)) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }

  // Les pages /@nom, /c/nom ou /user/nom ne peuvent pas être converties sans l'API YouTube.
  const channelId = segments[0] === "channel" ? segments[1] : null;
  if (channelId && YOUTUBE_CHANNEL_ID.test(channelId)) {
    return `https://www.youtube.com/embed/live_stream?channel=${channelId}&autoplay=1`;
  }

  return null;
}

function dailymotionEmbed(url: URL) {
  const segments = url.pathname.split("/").filter(Boolean);
  const videoId = url.hostname === "dai.ly" ? segments[0] : segments[0] === "video" ? segments[1] : null;
  if (!videoId || !DAILYMOTION_VIDEO_ID.test(videoId)) return null;
  return `https://geo.dailymotion.com/player.html?video=${videoId}`;
}

function twitchEmbed(url: URL, parentHost: string) {
  const segments = url.pathname.split("/").filter(Boolean);
  const parent = encodeURIComponent(parentHost);

  if (segments[0] === "videos" && segments[1] && TWITCH_VIDEO_ID.test(segments[1])) {
    return `https://player.twitch.tv/?video=${segments[1]}&parent=${parent}`;
  }
  if (segments.length === 1 && TWITCH_CHANNEL.test(segments[0])) {
    return `https://player.twitch.tv/?channel=${segments[0].toLowerCase()}&parent=${parent}`;
  }
  return null;
}

/**
 * Convertit une page de plateforme en URL de lecteur officiel intégrable.
 * `parentHost` est l'hôte de FREE TV, exigé par Twitch.
 */
export function getEmbedUrl(sourceUrl: string, kind: ChannelKind, parentHost: string) {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const hostname = url.hostname.toLowerCase();
  if (kind === "youtube" && (isHostOf(hostname, "youtube.com") || hostname === "youtu.be")) {
    return youtubeEmbed(url);
  }
  if (kind === "dailymotion" && (isHostOf(hostname, "dailymotion.com") || hostname === "dai.ly")) {
    return dailymotionEmbed(url);
  }
  if (kind === "twitch" && isHostOf(hostname, "twitch.tv")) return twitchEmbed(url, parentHost);
  return null;
}
