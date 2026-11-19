// The Rock Network on Cloudflare: every request is served from the built site (./dist) by the static assets
// binding, which also applies public/_redirects, the 404 page and dropped trailing slashes (wrangler.jsonc).
// The only job here is sending www to the bare domain, which _redirects can't do (it matches paths, not hosts).
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "www.therocknetwork.com") {
      url.hostname = "therocknetwork.com";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
