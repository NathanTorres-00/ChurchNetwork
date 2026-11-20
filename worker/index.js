import { getWeeklyVideo, rewriteWeeklyVideo } from "./weekly-video.js";
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.hostname === "www.therocknetwork.com") {
      url.hostname = "therocknetwork.com";
      return Response.redirect(url.toString(), 301);
    }
    if (request.method !== "GET" || !["/groups", "/videos"].includes(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    const headers = new Headers(request.headers);
    headers.delete("if-none-match");
    headers.delete("if-modified-since");
    const response = await env.ASSETS.fetch(new Request(request, { headers }));
    if (!response.ok || !response.headers.get("content-type")?.startsWith("text/html")) return response;
    const video = await getWeeklyVideo(url.origin, ctx);
    return video ? rewriteWeeklyVideo(response, video) : response;
  },
};
