export interface Album {
  /** Spotify album link, e.g. https://open.spotify.com/album/4LH4d3cOWNNsVw41Gqt2kv */
  spotify: string;
  /** Optional one-liner shown under the album. */
  note?: string;
  /** Title, artist and year are looked up from Spotify at build time; set these to override. */
  title?: string;
  artist?: string;
  year?: string;
}

// The Jukebox panel stays hidden while this list is empty.
export const albums: Album[] = [
  { spotify: "https://open.spotify.com/album/1XJET4J6WgkMkalolZojgR" },
];
