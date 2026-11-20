import { SaxesParser } from "saxes";

const playlist = "PLCpaiSkBElnLmFRV9CAfFRn8_sISpvqh_";
const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlist}`;
const atom = "http://www.w3.org/2005/Atom";
const youtube = "http://www.youtube.com/xml/schemas/2015";

/** Pick by publication date, since a playlist can be reordered. */
export function latestPlaylistVideo(xml) {
  const parser = new SaxesParser({ xmlns: true });
  let depth = 0;
  let entry;
  let field;
  let latest;
  let published = -Infinity;

  parser.on("opentag", (tag) => {
    depth += 1;
    if (depth === 2 && tag.uri === atom && tag.local === "entry") entry = {};
    if (!entry || depth !== 3) return;
    if (tag.uri === youtube && tag.local === "videoId") field = "youtubeId";
    if (tag.uri === atom && ["title", "published"].includes(tag.local)) field = tag.local;
    if (field) entry[field] = "";
  });
  const append = (text) => {
    if (entry && field) entry[field] += text;
  };
  parser.on("text", append);
  parser.on("cdata", append);
  parser.on("closetag", () => {
    if (depth === 3) field = undefined;
    if (depth === 2 && entry) {
      const date = Date.parse(entry.published);
      const title = entry.title?.trim();
      const youtubeId = entry.youtubeId?.trim();
      if (title && /^[\w-]{11}$/.test(youtubeId ?? "") && date > published) {
        published = date;
        latest = { youtubeId, title };
      }
      entry = undefined;
    }
    depth -= 1;
  });
  try {
    parser.write(xml).close();
    return latest;
  } catch {
    return undefined;
  }
}

export async function getWeeklyVideo(origin, ctx) {
  const key = new Request(new URL("/.weekly-video-cache", origin));
  try {
    const cached = await caches.default.match(key);
    if (cached) return await cached.json();

    const feed = await fetch(feedUrl, { signal: AbortSignal.timeout(2500) });
    if (!feed.ok) return undefined;
    const video = latestPlaylistVideo(await feed.text());
    if (video) {
      ctx.waitUntil(caches.default.put(key, Response.json(video, {
        headers: { "Cache-Control": "public, max-age=900" },
      })).catch(() => {}));
    }
    return video;
  } catch {
    return undefined;
  }
}

export function rewriteWeeklyVideo(response, { youtubeId, title }) {
  const poster = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  const rewriter = new HTMLRewriter()
    .on("#network-video", {
      element(el) {
        el.setAttribute("data-youtube", youtubeId).setAttribute("data-title", title);
      },
    })
    .on("#network-video img, [data-weekly-hero] img", {
      element(el) { el.setAttribute("src", poster); },
    })
    .on("[data-weekly-hero] h2", {
      element(el) { el.setInnerContent(title); },
    })
    .on("[data-weekly-hero] a[data-youtube]", {
      element(el) {
        el.setAttribute("href", `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&playsinline=1`);
        el.setAttribute("data-video-title", title);
      },
    });

  const updated = new Response(response.body, response);
  updated.headers.delete("etag");
  updated.headers.delete("last-modified");
  updated.headers.set("cache-control", "no-store");
  return rewriter.transform(updated);
}
