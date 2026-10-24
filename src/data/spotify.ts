import type { Album } from "./albums";

export interface AlbumInfo {
  url: string;
  title: string;
  artist?: string;
  year?: string;
  cover?: string;
  note?: string;
}

const ALBUM_URL = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?album\/([A-Za-z0-9]{22})/;

function decode(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/**
 * Looks an album up on Spotify at build time. Title and cover come from the
 * public oEmbed endpoint; artist and year come from the album page's
 * og:description ("Artist · album · 1973 · 10 songs"). Anything that fails
 * to load is left out rather than failing the build.
 */
export async function loadAlbum(album: Album): Promise<AlbumInfo> {
  const match = album.spotify.match(ALBUM_URL);
  if (!match) throw new Error(`Not a Spotify album link: ${album.spotify}`);
  const url = `https://open.spotify.com/album/${match[1]}`;
  const info: AlbumInfo = { url, title: album.title ?? "Unknown album", note: album.note };

  const [embed, page] = await Promise.allSettled([
    fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`).then((r) => {
      if (!r.ok) throw new Error(`oEmbed ${r.status}`);
      return r.json() as Promise<{ title?: string; thumbnail_url?: string }>;
    }),
    fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => {
      if (!r.ok) throw new Error(`page ${r.status}`);
      return r.text();
    }),
  ]);

  if (embed.status === "fulfilled") {
    info.title = album.title ?? embed.value.title ?? info.title;
    info.cover = embed.value.thumbnail_url;
  } else {
    console.warn(`[albums] ${url}: ${embed.reason}`);
  }

  if (page.status === "fulfilled") {
    const desc = page.value.match(/<meta property="og:description" content="([^"]*)"/)?.[1];
    const parts = desc ? decode(desc).split(" · ") : [];
    // The last three parts are the type, year and track count.
    if (parts.length >= 4) {
      info.artist = parts.slice(0, -3).join(" · ");
      if (/^\d{4}$/.test(parts[parts.length - 2])) info.year = parts[parts.length - 2];
    }
  } else {
    console.warn(`[albums] ${url}: ${page.reason}`);
  }

  info.artist = album.artist ?? info.artist;
  info.year = album.year ?? info.year;
  return info;
}
