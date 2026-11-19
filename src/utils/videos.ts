import { getEntries, getEntry } from "astro:content";

/** A video ready to show: its content plus the player address. */
export type Video = {
  id: string;
  title: string;
  vimeoId: string;
  poster: string;
  duration: number;
  description?: string;
  /** Vimeo's player address; the player adds autoplay when it opens. */
  src: string;
  /** The series it belongs to, e.g. "Vision Videos". */
  series: string;
  /** How screen readers name it, e.g. "Vision video: Think Small". */
  label: string;
};

export type VideoSeries = { id: string; heading: string; videos: Video[] };

export const vimeoSrc = (id: string) => `https://player.vimeo.com/video/${id}?autopause=0&player_id=0&app_id=58479`;

/** 226 → "3 min 46 sec", for reading; `short` gives "3:46". */
export const formatDuration = (seconds: number, short = false) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (short) return `${m}:${String(s).padStart(2, "0")}`;
  return s ? `${m} min ${s} sec` : `${m} min`;
};

/** The Videos page's content: its heading, the featured videos and the series rows (src/content/pages/videos.json). */
export async function getVideos() {
  const page = (await getEntry("videosPage", "videos"))!.data;
  const series: VideoSeries[] = [];
  const byId = new Map<string, Video>();
  for (const group of page.series) {
    const entries = await getEntries(group.videos);
    const videos = entries.map((entry) => {
      const video: Video = {
        id: entry.id,
        ...entry.data,
        src: vimeoSrc(entry.data.vimeoId),
        series: group.heading,
        label: `${group.label}: ${entry.data.title}`,
      };
      byId.set(entry.id, video);
      return video;
    });
    series.push({ id: group.id, heading: group.heading, videos });
  }
  const featured = page.featured.map((ref) => byId.get(ref.id)).filter((video): video is Video => Boolean(video));
  return { heading: page.heading, featured, series };
}
