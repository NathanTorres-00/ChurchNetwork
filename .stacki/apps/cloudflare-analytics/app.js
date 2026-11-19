'use strict';

const API = 'https://api.cloudflare.com/client/v4/graphql';
const DAY = 24 * 60 * 60 * 1000;
const $ = (id) => document.getElementById(id);

/* ---------- Bot detection (user agent) ----------
   Cloudflare's free plans have no bot score, so bots are told apart by user agent.
   The server filters (BOT_LIKE) and the client naming (BOT_NAMES) cover the same crawlers. */
const BOT_LIKE = [
  '%bot%', '%Bot%', '%BOT%', '%crawl%', '%Crawl%', '%spider%', '%Spider%', '%slurp%', '%Slurp%',
  '%headless%', '%Headless%', '%Robot%', '%robot%', '%curl/%', '%wget%', '%Wget%', '%python%', '%Python%',
  '%Java/%', '%Go-http%', '%okhttp%', '%axios%', '%node-fetch%', '%undici%', '%scrapy%', '%libwww%',
  '%HttpClient%', '%Lighthouse%', '%Pingdom%', '%Uptime%', '%GTmetrix%', '%facebookexternalhit%',
  '%meta-externalagent%', '%ChatGPT%', '%Claude-%', '%Perplexity%', '%Google-%', '%Mediapartners%',
  '%anthropic%', '%cohere%', '%Mistral%', '%ia_archiver%', '%Ahrefs%', '%Semrush%', '%PetalBrowser%', '%PhantomJS%', '%Puppeteer%',
];

// [regex, name, type]; first match wins
const BOT_NAMES = [
  [/Googlebot|Google-InspectionTool|GoogleOther|Google-Read-Aloud|Mediapartners|AdsBot|Google-Site/i, 'Googlebot', 'Search engines'],
  [/bingbot|BingPreview|msnbot/i, 'Bingbot', 'Search engines'],
  [/DuckDuckBot/i, 'DuckDuckBot', 'Search engines'],
  [/YandexBot|Yandex/i, 'YandexBot', 'Search engines'],
  [/Baiduspider/i, 'Baiduspider', 'Search engines'],
  [/Applebot/i, 'Applebot', 'Search engines'],
  [/Slurp/i, 'Yahoo Slurp', 'Search engines'],
  [/Qwant|Ecosia|SeznamBot|PetalBot|PetalBrowser|Sogou|Exabot/i, 'Other search bots', 'Search engines'],
  [/GPTBot|ChatGPT|OAI-SearchBot/i, 'OpenAI (GPTBot / ChatGPT)', 'AI crawlers'],
  [/ClaudeBot|Claude-|anthropic/i, 'Anthropic (ClaudeBot)', 'AI crawlers'],
  [/PerplexityBot|Perplexity/i, 'PerplexityBot', 'AI crawlers'],
  [/Google-Extended/i, 'Google-Extended', 'AI crawlers'],
  [/meta-externalagent|FacebookBot/i, 'Meta AI crawler', 'AI crawlers'],
  [/Bytespider|Amazonbot|CCBot|cohere|Diffbot|YouBot|MistralAI|Timpibot/i, 'Other AI crawlers', 'AI crawlers'],
  [/AhrefsBot|Ahrefs/i, 'AhrefsBot', 'SEO tools'],
  [/SemrushBot|Semrush/i, 'SemrushBot', 'SEO tools'],
  [/MJ12bot|DotBot|BLEXBot|Screaming Frog|SISTRIX|Serpstat|DataForSeo|Rogerbot|UptimeRobot/i, 'Other SEO tools', 'SEO tools'],
  [/facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|Pinterestbot|SkypeUriPreview/i, 'Link previews', 'Social previews'],
  [/Lighthouse|GTmetrix|Pingdom|Uptime|PageSpeed|StatusCake|Site24x7|Datadog|NewRelic/i, 'Speed and uptime monitors', 'Monitoring'],
  [/HeadlessChrome|Headless|Puppeteer|PhantomJS|Playwright|Selenium/i, 'Headless browsers', 'Scripts and tools'],
  [/curl|wget|python|Java\/|Go-http|okhttp|axios|node-fetch|undici|scrapy|libwww|HttpClient/i, 'Scripts and libraries', 'Scripts and tools'],
];

/* ---------- Channel detection ---------- */
const SEARCH = /(^|\.)(google|bing|duckduckgo|ecosia|yahoo|baidu|yandex|brave|startpage|qwant|seznam|naver|sogou|kagi|search)\./i;
const SOCIAL = /(^|\.)(facebook|fb|instagram|linkedin|lnkd|twitter|x|t|youtube|youtu|reddit|pinterest|tiktok|xing|threads|mastodon|bsky|whatsapp|telegram|snapchat)\.(com|co|in|be|me|app|net|org|social|ch|de)$/i;
const AI = /(^|\.)(chatgpt\.com|chat\.openai\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|you\.com|phind\.com|poe\.com|grok\.com)$/i;
const MAIL = /(^|\.)(mail\.google\.com|outlook\.(live|office)\.com|mail\.yahoo\.com|proton\.me|mail\.proton\.me)$/i;
// Used when the plan cannot filter on content type: static files are left out by path.
const ASSET_LIKE = ['%.js', '%.css', '%.png', '%.jpg', '%.jpeg', '%.gif', '%.webp', '%.avif', '%.svg', '%.ico', '%.woff', '%.woff2', '%.ttf', '%.map', '%.json', '%.xml', '%.txt', '%.mp4', '%.webm', '%.pdf', '/_astro/%', '/fonts/%', '/cdn-cgi/%'];
const ADS_LIKE = ['%gclid=%', '%gbraid=%', '%wbraid=%', '%msclkid=%', '%utm_medium=cpc%', '%utm_medium=ppc%', '%utm_medium=paid%', '%utm_medium=paidsocial%'];

function channelOf(host) {
  if (!host) return 'Direct';
  if (AI.test(host)) return 'AI assistants';
  if (MAIL.test(host)) return 'Email';
  if (SEARCH.test(host)) return 'Organic search';
  if (SOCIAL.test(host)) return 'Social';
  return 'Referral';
}

/* AI crawlers one by one: [regex, name, purpose]; first match wins. */
const AI_CRAWLERS = [
  [/GPTBot/i, 'GPTBot (OpenAI)', 'Training'],
  [/OAI-SearchBot/i, 'OAI-SearchBot (OpenAI)', 'Search'],
  [/ChatGPT-User/i, 'ChatGPT-User (OpenAI)', 'User request'],
  [/ChatGPT/i, 'ChatGPT (OpenAI)', 'User request'],
  [/ClaudeBot/i, 'ClaudeBot (Anthropic)', 'Training'],
  [/Claude-SearchBot/i, 'Claude-SearchBot (Anthropic)', 'Search'],
  [/Claude-User/i, 'Claude-User (Anthropic)', 'User request'],
  [/anthropic-ai|Claude-/i, 'Anthropic (other)', 'Training'],
  [/PerplexityBot/i, 'PerplexityBot', 'Search'],
  [/Perplexity-User/i, 'Perplexity-User', 'User request'],
  [/Google-Extended/i, 'Google-Extended', 'Training'],
  [/Applebot-Extended/i, 'Applebot-Extended (Apple)', 'Training'],
  [/meta-externalagent|meta-externalfetcher|FacebookBot/i, 'Meta AI', 'Training'],
  [/Bytespider/i, 'Bytespider (ByteDance)', 'Training'],
  [/Amazonbot/i, 'Amazonbot', 'Training'],
  [/CCBot/i, 'CCBot (Common Crawl)', 'Training'],
  [/DuckAssistBot/i, 'DuckAssistBot', 'User request'],
  [/MistralAI/i, 'MistralAI-User', 'User request'],
  [/YouBot/i, 'YouBot', 'Search'],
  [/cohere/i, 'Cohere', 'Training'],
  [/Diffbot|Timpibot|ImagesiftBot|Omgili/i, 'Other AI crawlers', 'Training'],
];
function aiOf(ua) {
  for (const [re, name, purpose] of AI_CRAWLERS) if (re.test(ua)) return { name, purpose };
  return null;
}

/* ---------- User agent parsing ---------- */
function browserOf(ua) {
  if (/Edg(e|A|iOS)?\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
  if (/Vivaldi/.test(ua)) return 'Vivaldi';
  if (/DuckDuckGo/.test(ua)) return 'DuckDuckGo';
  if (/Firefox|FxiOS/.test(ua)) return 'Firefox';
  if (/Chrome|CriOS/.test(ua)) return 'Chrome';
  if (/Safari/.test(ua)) return 'Safari';
  return 'Other';
}
function deviceOf(ua) {
  if (/iPad|Tablet|PlayBook|Silk/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) return 'tablet';
  if (/Mobi|iPhone|iPod|Android/.test(ua)) return 'mobile';
  return 'desktop';
}
function botOf(ua) {
  for (const [re, name, type] of BOT_NAMES) if (re.test(ua)) return { name, type };
  if (!ua) return { name: 'No user agent', type: 'Scripts and tools' };
  const m = ua.match(/([A-Za-z0-9_.-]*(?:bot|crawl|spider)[A-Za-z0-9_.-]*)/i);
  return { name: m ? m[1] : 'Other bots', type: 'Other bots' };
}

const regionNames = (() => {
  try { return new Intl.DisplayNames(['en'], { type: 'region' }); } catch { return null; }
})();
function countryName(code) {
  if (!code || code === 'XX') return 'Unknown';
  if (code === 'T1') return 'Tor network';
  try { return (regionNames && regionNames.of(code)) || code; } catch { return code; }
}

/* ---------- GraphQL ---------- */
const lit = (v) =>
  Array.isArray(v) ? `[${v.map(lit).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.entries(v).map(([k, x]) => `${k}:${lit(x)}`).join(',')}}`
  : JSON.stringify(v);

function filters(cfg, opts, start, end) {
  const base = {
    datetime_geq: start.toISOString(),
    datetime_lt: end.toISOString(),
    requestSource: 'eyeball',
  };
  if (opts.html) base.edgeResponseContentType = 'html';
  if (!opts.html && opts.paths) base.AND = ASSET_LIKE.map((p) => ({ clientRequestPath_notlike: p }));
  if (cfg.hosts.length) base.clientRequestHTTPHost_in = cfg.hosts;
  const human = { ...base, AND: [...(base.AND || []), { userAgent_neq: '' }, ...BOT_LIKE.map((p) => ({ userAgent_notlike: p }))] };
  const bot = { ...base, OR: [{ userAgent: '' }, ...BOT_LIKE.map((p) => ({ userAgent_like: p }))] };
  const humanNoAds = { ...human, AND: [...human.AND, ...ADS_LIKE.map((p) => ({ clientRequestQuery_notlike: p }))] };
  const humanAds = { ...human, AND: [...human.AND], OR: ADS_LIKE.map((p) => ({ clientRequestQuery_like: p })) };
  return { human, bot, humanNoAds, humanAds };
}

function buildQuery(cfg, opts, start, end) {
  const f = filters(cfg, opts, start, end);
  const g = (alias, filter, dims, limit) =>
    `${alias}: httpRequestsAdaptiveGroups(filter: ${lit(filter)}, limit: ${limit}, orderBy: [count_DESC]) { count${dims ? ` dimensions { ${dims} }` : ''} }`;
  const dev = opts.deviceType ? ' clientDeviceType' : '';
  const parts = [
    g('humanTotal', f.human, '', 1),
    g('botTotal', f.bot, '', 1),
    g('botUA', f.bot, 'userAgent', 2000),
    g('humanUA', f.human, `userAgent${dev}`, 5000),
    ...(opts.country ? [g('humanCountry', f.human, 'clientCountryName', 300)] : []),
    ...(opts.referrer ? [g('humanRef', opts.ads ? f.humanNoAds : f.human, 'clientRefererHost', 2000)] : []),
  ];
  if (opts.ads && opts.referrer) parts.push(g('ads', f.humanAds, 'clientRefererHost', 500));
  return `query { viewer { zones(filter: { zoneTag: ${JSON.stringify(cfg.zone)} }) { ${parts.join('\n')} } } }`;
}

async function gql(cfg, query) {
  const reply = await stacki.net.fetch({
    url: API,
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.token}` },
    body: JSON.stringify({ query }),
  });
  let json;
  try { json = JSON.parse(reply.body); } catch { throw new Error(`Cloudflare answered ${reply.status} without JSON`); }
  if (reply.status === 401 || reply.status === 403) throw new Error('Cloudflare refused the token. It needs Zone > Analytics > Read.');
  const zone = json.data && json.data.viewer && json.data.viewer.zones && json.data.viewer.zones[0];
  if (json.errors && json.errors.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  if (!zone) throw new Error('Zone not found. Check the zone ID and that the token covers this zone.');
  return zone;
}

/* One day per request: every plan allows a 24 h window. A field a plan lacks is dropped and the run repeats. */
async function loadChunk(cfg, opts, start, end) {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      return await gql(cfg, buildQuery(cfg, opts, start, end));
    } catch (err) {
      const msg = String(err.message);
      if (opts.html && /edgeResponseContentType/i.test(msg)) { opts.html = false; continue; }
      if (opts.paths && /clientRequestPath/i.test(msg)) { opts.paths = false; continue; }
      if (opts.deviceType && /clientDeviceType/i.test(msg)) { opts.deviceType = false; continue; }
      if (opts.ads && /clientRequestQuery/i.test(msg)) { opts.ads = false; continue; }
      if (opts.referrer && /clientRefererHost/i.test(msg)) { opts.referrer = false; continue; }
      if (opts.country && /clientCountryName/i.test(msg)) { opts.country = false; continue; }
      throw err;
    }
  }
  throw new Error('Cloudflare rejected the query.');
}

/* ---------- Aggregation ---------- */
const add = (map, key, n) => map.set(key, (map.get(key) || 0) + n);

function newAgg() {
  return {
    human: 0, bot: 0, ads: 0, ai: 0, pages: new Map(), aiNames: new Map(), aiPurposes: new Map(),
    botTypes: new Map(), botNames: new Map(), botCountries: new Map(),
    channels: new Map(), referrers: new Map(), countries: new Map(), devices: new Map(), browsers: new Map(),
  };
}

function absorb(agg, zone, cfg) {
  const total = (rows) => (rows && rows[0] ? rows[0].count : 0);
  agg.human += total(zone.humanTotal);
  agg.bot += total(zone.botTotal);

  for (const r of zone.botUA || []) {
    const b = botOf(r.dimensions.userAgent || '');
    add(agg.botNames, `${b.name}\u0000${b.type}`, r.count);
    add(agg.botTypes, b.type, r.count);
    const ai = aiOf(r.dimensions.userAgent || '');
    if (ai) { add(agg.aiNames, `${ai.name}\u0000${ai.purpose}`, r.count); add(agg.aiPurposes, ai.purpose, r.count); agg.ai += r.count; }
  }
  for (const r of zone.humanCountry || []) add(agg.countries, countryName(r.dimensions.clientCountryName), r.count);
  for (const r of zone.humanUA || []) {
    const ua = r.dimensions.userAgent || '';
    add(agg.browsers, browserOf(ua), r.count);
    add(agg.devices, r.dimensions.clientDeviceType || deviceOf(ua), r.count);
  }
  const own = (host) => cfg.hosts.some((h) => host === h || host.endsWith(`.${h}`));
  for (const r of zone.humanRef || []) {
    const host = (r.dimensions.clientRefererHost || '').toLowerCase();
    if (host && own(host)) continue; // internal navigation, not a source
    add(agg.channels, channelOf(host), r.count);
    if (host) add(agg.referrers, host, r.count);
  }
  for (const r of zone.ads || []) {
    const host = (r.dimensions.clientRefererHost || '').toLowerCase();
    if (host && own(host)) continue;
    agg.ads += r.count;
  }
}

/* ---------- Rendering ---------- */
const fmt = (n) => Math.round(n).toLocaleString('en');
const pct = (n, t) => (t ? `${((n / t) * 100).toFixed(n / t < 0.1 ? 1 : 0)}%` : '–');

function rows(el, entries, { max = 10, total, tags, delta } = {}) {
  el.replaceChildren();
  el.classList.toggle('cmp', !!delta);
  const list = entries.slice(0, max);
  const sum = total != null ? total : entries.reduce((s, e) => s + e[1], 0);
  if (!list.length) {
    const li = document.createElement('li');
    li.innerHTML = '<span class="none">No data in this period</span>';
    li.querySelector('.none').style.gridColumn = '1 / -1';
    el.append(li);
    return;
  }
  const top = list[0][1] || 1;
  for (const [label, n] of list) {
    const li = document.createElement('li');
    const fill = document.createElement('span');
    fill.className = 'bar-fill';
    fill.style.width = `${(n / top) * 100}%`;
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = label;
    name.title = label;
    const num = document.createElement('span');
    num.className = 'n';
    num.textContent = fmt(n);
    const p = document.createElement('span');
    p.className = 'pct';
    p.textContent = pct(n, sum);
    li.append(fill, name, num, p);
    if (delta) {
      const d = delta(label, n);
      const ds = document.createElement('span');
      ds.className = `delta ${d ? d.cls : ''}`;
      ds.textContent = d ? d.text : '';
      li.append(ds);
    }
    if (tags && tags[label]) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = tags[label];
      name.append(' ', tag);
    }
    el.append(li);
  }
}

const sorted = (map) => [...map.entries()].sort((a, b) => b[1] - a[1]);

/* Change in daily average between the current period and the one right before it. */
function change(cur, curDays, prev, prevDays) {
  if (!prevDays || !curDays) return null;
  const c = cur / curDays;
  const p = prev / prevDays;
  if (!p) return c ? { text: 'new', cls: 'up' } : null;
  const d = ((c - p) / p) * 100;
  const r = Math.round(d);
  return { text: `${r > 0 ? '+' : ''}${r}%`, cls: r > 0 ? 'up' : r < 0 ? 'down' : '' };
}

const label0 = (k) => k.split('\u0000')[0];
function views(agg) {
  const pairs = (map) => sorted(map).map(([k, n]) => [label0(k), n, k.split('\u0000')[1]]);
  const channels = sorted(agg.channels);
  if (agg.ads) channels.push(['Ads', agg.ads]);
  channels.sort((a, b) => b[1] - a[1]);
  return {
    aiNames: pairs(agg.aiNames), aiPurposes: sorted(agg.aiPurposes), botTypes: sorted(agg.botTypes),
    botNames: pairs(agg.botNames), channels,
    referrers: sorted(agg.referrers), pages: sorted(agg.pages), countries: sorted(agg.countries),
    devices: sorted(agg.devices).map(([k, n]) => [k[0].toUpperCase() + k.slice(1), n]), browsers: sorted(agg.browsers),
  };
}

function render(agg, info, cmp) {
  const all = agg.human + agg.bot;
  const days = info.loaded;
  const pv = cmp ? views(cmp.agg) : null;
  const pall = cmp ? cmp.agg.human + cmp.agg.bot : 0;
  const kpiDelta = (id, cur, prev) => {
    const el = $(id);
    const d = cmp ? change(cur, days, prev, cmp.days) : null;
    el.textContent = d ? `${d.text} vs before` : '';
    el.className = `kpi-d ${d ? d.cls : ''}`;
  };
  $('k-human').textContent = fmt(agg.human);
  $('k-ai').textContent = fmt(agg.ai);
  $('k-share').textContent = pct(agg.ai, all);
  kpiDelta('d-human', agg.human, cmp ? cmp.agg.human : 0);
  kpiDelta('d-ai', agg.ai, cmp ? cmp.agg.ai : 0);
  const shareEl = $('d-share');
  if (cmp && pall && all) {
    const pts = (agg.ai / all - cmp.agg.ai / pall) * 100;
    shareEl.textContent = `${pts > 0 ? '+' : ''}${pts.toFixed(1)} pts vs before`;
    shareEl.className = `kpi-d ${pts > 0 ? 'up' : pts < 0 ? 'down' : ''}`;
  } else { shareEl.textContent = ''; shareEl.className = 'kpi-d'; }
  $('l-human').textContent = `${fmt(agg.human)} (${pct(agg.human, all)})`;
  $('l-ai').textContent = `${fmt(agg.ai)} (${pct(agg.ai, all)})`;
  $('l-other').textContent = `${fmt(Math.max(agg.bot - agg.ai, 0))} (${pct(Math.max(agg.bot - agg.ai, 0), all)})`;
  $('split').querySelector('.s-human').style.width = all ? `${(agg.human / all) * 100}%` : '0';
  $('split').querySelector('.s-ai').style.width = all ? `${(agg.ai / all) * 100}%` : '0';
  $('split').querySelector('.s-other').style.width = all ? `${(Math.max(agg.bot - agg.ai, 0) / all) * 100}%` : '0';

  const v = views(agg);
  const dl = (key) => {
    if (!cmp || !info.cardCmp) return undefined;
    const m = new Map(pv[key].map((e) => [e[0], e[1]]));
    return (label, n) => change(n, days, m.get(label) || 0, cmp.days);
  };
  const tagsOf = (list) => Object.fromEntries(list.map(([n, , t]) => [n, t]));
  const two = (list) => list.map(([n, c]) => [n, c]);
  rows($('ai-names'), two(v.aiNames), { max: 15, total: agg.ai, tags: tagsOf(v.aiNames), delta: dl('aiNames') });
  rows($('ai-purposes'), v.aiPurposes, { max: 4, total: agg.ai, delta: dl('aiPurposes') });
  rows($('bot-types'), v.botTypes, { max: 8, delta: dl('botTypes') });
  rows($('bot-names'), two(v.botNames), { max: 10, tags: tagsOf(v.botNames), delta: dl('botNames') });

  const sourceTotal = v.channels.reduce((t, e) => t + e[1], 0);
  rows($('channels'), v.channels, { max: 10, delta: dl('channels') });
  const refTags = Object.fromEntries(v.referrers.map(([h]) => [h, channelOf(h)]));
  rows($('referrers'), v.referrers, { max: 10, total: sourceTotal, tags: refTags, delta: dl('referrers') });

  rows($('pages'), v.pages, { max: 15, delta: dl('pages') });
  rows($('countries'), v.countries, { max: 15, delta: dl('countries') });
  rows($('devices'), v.devices, { max: 4, delta: dl('devices') });
  rows($('browsers'), v.browsers, { max: 10, delta: dl('browsers') });

  const notes = [
    'Page views are HTML requests Cloudflare counted at the edge, estimated from adaptive samples. Bots are told apart by user agent, so a bot that poses as a browser counts as human. AI share is the part of all page views (humans and all bots) that comes from AI crawlers.',
    'Brave and some privacy browsers look like Chrome and appear under Chrome.',
  ];
  if (!info.html && info.paths) notes.push('Page views leave out static files by path, because this plan cannot filter on content type.');
  if (!info.html && !info.paths) notes.push('This plan cannot filter pages from files, so counts include images, scripts and other requests.');
  if (!info.ads) notes.push('Ads are not shown: this plan does not expose the query string, so paid clicks sit under their referrer.');
  if (!info.referrer && !info.refsFromWeb) notes.push('Traffic sources are not shown: this plan does not expose the referrer.');
  if (info.refsFromWeb) notes.push('Channels, referrers and top pages come from Web Analytics (real browser visits), not from the request log.');
  if (!info.country) notes.push('Countries are not shown: this plan does not expose the country.');
  if (info.loaded < info.wanted) notes.push(`Only ${info.loaded} of ${info.wanted} days came back; your Cloudflare plan limits how far back analytics go.`);
  if (info.cmpNote) notes.push(info.cmpNote);
  $('note').textContent = notes.join(' ');
}

/* ---------- Loading ---------- */
let run = 0;

async function readConfig() {
  const s = await stacki.settings.get();
  return {
    token: (s['cloudflare-token'] || '').trim(),
    zone: (s['zone-id'] || '').trim(),
    account: (s['account-id'] || '').trim(),
    hosts: (s.hostnames || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean),
  };
}

function setStatus(text, error) {
  const el = $('status');
  el.textContent = text;
  el.classList.toggle('error', !!error);
}

/* ---------- Diagnosis for "not authorized": what does this token actually see? ---------- */
const mask = (id) => (id ? `${id.slice(0, 4)}…${id.slice(-4)}` : '?');
async function rest(cfg, path) {
  const reply = await stacki.net.fetch({ url: `https://api.cloudflare.com/client/v4${path}`, method: 'GET', headers: { authorization: `Bearer ${cfg.token}` } });
  try { return JSON.parse(reply.body); } catch { return { success: false, errors: [{ message: `HTTP ${reply.status}` }] }; }
}
async function diagnose(cfg) {
  const out = [];
  try {
    const v = await rest(cfg, '/user/tokens/verify');
    out.push(v.success ? `token status: ${v.result.status}` : `token check failed (${(v.errors || []).map((e) => e.message).join(', ')})`);
  } catch (e) { out.push(`token check error: ${e.message}`); }
  try {
    const z = await rest(cfg, `/zones/${cfg.zone}`);
    out.push(z.success ? `zone belongs to account ${mask(z.result.account && z.result.account.id)}` : `zone lookup failed (${(z.errors || []).map((e) => e.message).join(', ')})`);
  } catch (e) { out.push(`zone lookup error: ${e.message}`); }
  try {
    const a = await rest(cfg, '/accounts');
    out.push(a.success ? `accounts this token can see: ${(a.result || []).map((x) => `${x.name} ${mask(x.id)}`).join('; ') || 'none'}` : `account list failed (${(a.errors || []).map((e) => e.message).join(', ')})`);
  } catch (e) { out.push(`account list error: ${e.message}`); }
  out.push(`account ID in settings: ${mask(cfg.account)}`);
  return out.join(' | ');
}

/* ---------- Web Analytics: page views and visits (the beacon data, account level) ---------- */
async function loadWeb(cfg, start, end, hourly) {
  const bucket = hourly ? 'datetimeHour' : 'date';
  const run = async (useHost) => {
    const filter = { datetime_geq: start.toISOString(), datetime_lt: end.toISOString() };
    if (useHost && cfg.hosts.length) filter.requestHost_in = cfg.hosts;
    const query = `query { viewer { accounts(filter: { accountTag: ${JSON.stringify(cfg.account)} }) { series: rumPageloadEventsAdaptiveGroups(filter: ${lit(filter)}, limit: 5000, orderBy: [${bucket}_ASC]) { count sum { visits } dimensions { ${bucket} } } } } }`;
    const reply = await stacki.net.fetch({
      url: API, method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.token}` },
      body: JSON.stringify({ query }),
    });
    let json;
    try { json = JSON.parse(reply.body); } catch { throw new Error(`Cloudflare answered ${reply.status} without JSON`); }
    if (json.errors && json.errors.length) {
      const m = json.errors.map((e) => e.message).join('; ');
      if (/not authorized|authoriz/i.test(m)) throw new Error('Cloudflare says this token is not authorized for the account. Edit the token: add Account > Account Analytics > Read and set Account Resources to this account. Also check the account ID in the settings. (Cloudflare: ' + m + ')');
      throw new Error(m);
    }
    const acc = json.data && json.data.viewer && json.data.viewer.accounts && json.data.viewer.accounts[0];
    if (!acc) throw new Error('Account not found. Check the account ID and that the token has Account > Account Analytics > Read.');
    return acc.series || [];
  };
  let rows;
  let hostNote = cfg.hosts.length ? `host filter: ${cfg.hosts.join(', ')}` : 'no host filter';
  try { rows = await run(true); } catch (err) {
    if (/requestHost/i.test(String(err.message))) { rows = await run(false); hostNote = 'host filter rejected by Cloudflare, showing all hosts'; } else throw err;
  }
  if (!rows.length && cfg.hosts.length) {
    rows = await run(false);
    hostNote = `no rows for ${cfg.hosts.join(', ')}, showing all hosts${rows.length ? '' : ' (still none)'}`;
  }
  const points = rows.map((r) => ({ t: r.dimensions[bucket], pv: r.count, v: (r.sum && r.sum.visits) || 0 }));
  return { points, hostNote, pv: points.reduce((t, p) => t + p.pv, 0), visits: points.reduce((t, p) => t + p.v, 0) };
}

/* Referrers and top pages from Web Analytics (real browser visits). The request log cannot give referrers on this plan. */
async function webGroups(cfg, start, end, dim, useHost) {
  const filter = { datetime_geq: start.toISOString(), datetime_lt: end.toISOString() };
  if (useHost && cfg.hosts.length) filter.requestHost_in = cfg.hosts;
  const query = `query { viewer { accounts(filter: { accountTag: ${JSON.stringify(cfg.account)} }) { g: rumPageloadEventsAdaptiveGroups(filter: ${lit(filter)}, limit: 2000, orderBy: [count_DESC]) { count dimensions { ${dim} } } } } }`;
  const reply = await stacki.net.fetch({
    url: API, method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.token}` },
    body: JSON.stringify({ query }),
  });
  let json;
  try { json = JSON.parse(reply.body); } catch { throw new Error(`Cloudflare answered ${reply.status} without JSON`); }
  if (json.errors && json.errors.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  const acc = json.data && json.data.viewer && json.data.viewer.accounts && json.data.viewer.accounts[0];
  if (!acc) throw new Error('Account not found');
  return acc.g || [];
}

async function loadBreakdown(cfg, start, end) {
  const out = { refs: null, pages: null, notes: [] };
  await Promise.all([['refs', 'refererHost'], ['pages', 'requestPath']].map(async ([key, dim]) => {
    try {
      let rows;
      try { rows = await webGroups(cfg, start, end, dim, true); } catch (err) {
        if (/requestHost/i.test(String(err.message))) rows = await webGroups(cfg, start, end, dim, false); else throw err;
      }
      if (!rows.length && cfg.hosts.length) rows = await webGroups(cfg, start, end, dim, false);
      out[key] = rows.map((r) => [r.dimensions[dim] || '', r.count]);
    } catch (err) {
      out.notes.push(`${dim}: ${err.message}`);
    }
  }));
  return out;
}

/* Replace the (empty) request-log sources with the Web Analytics ones. */
function applyBreakdown(agg, bd, cfg, { refs, pages }) {
  const own = (host) => cfg.hosts.some((h) => host === h || host.endsWith(`.${h}`));
  if (refs && bd.refs) {
    agg.channels.clear();
    agg.referrers.clear();
    for (const [raw, n] of bd.refs) {
      const host = raw.toLowerCase();
      if (host && own(host)) continue;
      add(agg.channels, channelOf(host), n);
      if (host) add(agg.referrers, host, n);
    }
  }
  if (pages && bd.pages) for (const [p, n] of bd.pages) add(agg.pages, p || '/', n);
}

function spark(el, values) {
  el.replaceChildren();
  if (values.length < 2) return;
  const max = Math.max(...values, 1);
  const x = (i) => (i / (values.length - 1)) * 100;
  const y = (v) => 30 - (v / max) * 28 - 1;
  const line = values.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
  const NS = 'http://www.w3.org/2000/svg';
  const area = document.createElementNS(NS, 'polygon');
  area.setAttribute('points', `0,30 ${line} 100,30`);
  area.setAttribute('class', 'spark-area');
  const path = document.createElementNS(NS, 'polyline');
  path.setAttribute('points', line);
  path.setAttribute('class', 'spark-line');
  el.append(area, path);
}

function renderWeb(web, prev, days) {
  const msg = $('web-msg');
  msg.hidden = false;
  msg.textContent = web.error ? `Pageviews and visits: ${web.error}` : `Web Analytics: ${web.points.length} data points, ${web.hostNote}.`;
  for (const [key, label] of [['pv', 'w-pv'], ['visits', 'w-visits']]) {
    $(label).textContent = web.error ? '–' : fmt(web[key]);
    const d = !web.error && prev && !prev.error ? change(web[key], days, prev[key], days) : null;
    const el = $(`${label}-d`);
    el.textContent = d ? d.text : '';
    el.className = `stat-d ${d ? d.cls : ''}`;
    spark($(`${label}-spark`), web.error ? [] : web.points.map((p) => (key === 'pv' ? p.pv : p.v)));
  }
}

/* The first day runs alone so a missing field is dropped once, then the rest run four at a time. */
async function fetchAgg(cfg, opts, windows, cancelled) {
  const agg = newAgg();
  let firstError = null;
  absorb(agg, await loadChunk(cfg, opts, ...windows[0]), cfg);
  let loaded = 1;
  const rest = windows.slice(1);
  let next = 0;
  const worker = async () => {
    while (next < rest.length && !cancelled()) {
      const w = rest[next++];
      try {
        absorb(agg, await loadChunk(cfg, opts, ...w), cfg);
        loaded++;
      } catch (err) {
        firstError = firstError || err;
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return { agg, loaded, firstError };
}

async function load() {
  const mine = ++run;
  const cfg = await readConfig();
  const ready = !!(cfg.token && cfg.zone);
  $('setup').hidden = ready;
  $('dash').hidden = !ready;
  if (!ready) { setStatus(''); return; }

  const days = Number($('range').value) || 7;
  // The comparison always has the same length as the range: 24 h vs the 24 h before, 7 days vs the 7 days before, 30 days vs the 30 days before.
  // The big numbers at the top always compare with the previous period. The tabs only switch the comparison on the detail cards.
  const cmpDays = days;
  const cardCmp = $('compare').value === '1';
  $('compare-on').textContent = days === 1 ? 'Cards vs previous 24 h' : `Cards vs previous ${days} days`;
  const opts = { ads: true, deviceType: true, html: false, paths: true, referrer: true, country: true };
  const now = new Date();
  const windowsFor = (n, offset) => Array.from({ length: n }, (_, i) => [new Date(now - (offset + i + 1) * DAY), new Date(now - (offset + i) * DAY)]);

  setStatus('Loading from Cloudflare…');
  $('refresh').disabled = true;
  const webJob = (async () => {
    if (!cfg.account) return { cur: { error: 'Add your Cloudflare account ID in the settings to see page views and visits. The token also needs Account > Account Analytics > Read.' } };
    const hourly = days <= 7;
    const get = (a, b) => loadWeb(cfg, a, b, hourly).catch(async (e) => {
      let error = e.message || String(e);
      if (/authoriz/i.test(error)) error += ` Diagnosis: ${await diagnose(cfg).catch(() => 'could not run')}`;
      return { error };
    });
    const [c, p] = await Promise.all([get(new Date(now - days * DAY), now), cmpDays ? get(new Date(now - 2 * days * DAY), new Date(now - days * DAY)) : null]);
    const bdGet = (a, b) => loadBreakdown(cfg, a, b).catch((e) => ({ refs: null, pages: null, notes: [e.message || String(e)] }));
    const [bc, bp] = await Promise.all([bdGet(new Date(now - days * DAY), now), cmpDays ? bdGet(new Date(now - 2 * days * DAY), new Date(now - days * DAY)) : null]);
    return { cur: c, prev: p, bdCur: bc, bdPrev: bp };
  })();
  // Page views and visits show as soon as they arrive, even if the request log below fails.
  webJob.then((w) => { if (mine === run) renderWeb(w.cur, w.prev, days); }).catch((e) => { if (mine === run) renderWeb({ error: e.message || String(e) }, null, days); });
  try {
    const cur = await fetchAgg(cfg, opts, windowsFor(days, 0), () => mine !== run);
    if (mine !== run) return;
    let cmp = null;
    let cmpNote = '';
    if (cmpDays) {
      try {
        // The comparison covers the days right before the current range, so "7 days" vs "7 days" is this week against last week.
        const prev = await fetchAgg(cfg, opts, windowsFor(cmpDays, days), () => mine !== run);
        if (mine !== run) return;
        if (prev.loaded) {
          cmp = { agg: prev.agg, days: prev.loaded };
          cmpNote = `Changes compare the daily average of this period with the ${prev.loaded} ${prev.loaded === 1 ? 'day' : 'days'} right before it${prev.loaded < cmpDays ? ` (your plan only returned ${prev.loaded} of ${cmpDays})` : ''}.`;
        } else cmpNote = 'The comparison period returned no data.';
      } catch (err) {
        cmpNote = `Comparison failed: ${err.message}`;
      }
    }
    const w = await webJob.catch(() => null);
    let fromWeb = false;
    if (w && w.bdCur && !(w.cur && w.cur.error)) {
      const both = (k) => !!w.bdCur[k] && (!cmp || !!(w.bdPrev && w.bdPrev[k]));
      const use = { refs: both('refs'), pages: both('pages') };
      applyBreakdown(cur.agg, w.bdCur, cfg, use);
      if (cmp && w.bdPrev) applyBreakdown(cmp.agg, w.bdPrev, cfg, use);
      fromWeb = use.refs;
      if (w.bdCur.notes.length) cmpNote = `${cmpNote} Web Analytics breakdown: ${w.bdCur.notes.join('; ')}`.trim();
    }
    render(cur.agg, { ads: opts.ads, html: opts.html, paths: opts.paths, referrer: opts.referrer, country: opts.country, loaded: cur.loaded, wanted: days, cmpNote, refsFromWeb: fromWeb, cardCmp }, cmp);
    const label = days === 1 ? 'the last 24 hours' : `the last ${days} days`;
    setStatus(`Showing ${label}. Updated ${new Date().toLocaleTimeString()}.`);
    if (cur.firstError && cur.loaded < days) setStatus(`Showing ${cur.loaded} of ${days} days. ${cur.firstError.message}`, true);
  } catch (err) {
    if (mine !== run) return;
    setStatus(err.message || String(err), true);
  } finally {
    if (mine === run) $('refresh').disabled = false;
  }
}

/* ---------- Cards on/off: remembered on this computer ---------- */
const cardView = (function () {
  const KEY = 'card-hidden';
  const all = () => [...document.querySelectorAll('#dash [data-card], #dash .cards > .card')];
  for (const c of document.querySelectorAll('.cards > .card')) c.dataset.card = c.querySelector('ol').id;
  const title = (c) => c.querySelector('h2').firstChild.textContent.trim();
  let hidden = new Set();
  try { hidden = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...hidden])); } catch {} };
  function apply() {
    for (const c of all()) c.hidden = hidden.has(c.dataset.card);
    $('add-card').hidden = !all().some((c) => c.hidden);
    document.querySelector('.cards').append($('add-card'));
    const list = $('toggles');
    list.textContent = '';
    for (const c of all()) {
      const li = document.createElement('li');
      const label = document.createElement('label');
      label.className = 'switch';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.setAttribute('role', 'switch');
      box.checked = !hidden.has(c.dataset.card);
      box.addEventListener('change', () => set(c.dataset.card, !box.checked));
      const track = document.createElement('i');
      track.className = 'track';
      const text = document.createElement('span');
      text.textContent = title(c);
      label.append(box, track, text);
      li.append(label);
      list.append(li);
    }
  }
  function set(id, off) {
    if (off) { const el = all().find((c) => c.dataset.card === id); if (el && el.offsetHeight) $('add-card').style.minHeight = `${el.offsetHeight}px`; }
    if (off) hidden.add(id); else hidden.delete(id); save(); apply(); }
  // three dots menu in each card corner
  const menu = document.createElement('div');
  menu.className = 'card-menu';
  menu.hidden = true;
  const hide = document.createElement('button');
  hide.type = 'button';
  hide.textContent = 'Hide card';
  menu.append(hide);
  document.body.append(menu);
  let target = null;
  const close = () => { menu.hidden = true; target = null; };
  hide.addEventListener('click', () => { if (target) set(target, true); close(); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.more') && !e.target.closest('.card-menu')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  for (const c of all()) {
    const h2 = c.querySelector('h2');
    const tools = document.createElement('span');
    tools.className = 'tools';
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'more';
    more.title = 'Card options';
    more.setAttribute('aria-label', `Options for ${title(c)}`);
    more.setAttribute('aria-haspopup', 'menu');
    more.textContent = '⋯';
    more.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!menu.hidden && target === c.dataset.card) return close();
      target = c.dataset.card;
      const r = more.getBoundingClientRect();
      menu.hidden = false;
      menu.style.top = `${r.bottom + 4}px`;
      menu.style.left = `${Math.max(8, r.right - menu.offsetWidth)}px`;
      hide.focus();
    });
    tools.append(more);
    h2.append(tools);
  }
  $('show-all').addEventListener('click', () => { hidden.clear(); save(); apply(); });
  const tab = () => {
    const v = $('settings-tab').value || 'connection';
    $('tab-connection').hidden = v !== 'connection';
    $('tab-cards').hidden = v !== 'cards';
  };
  $('settings-tab').addEventListener('change', tab);
  $('settings-back').addEventListener('click', () => { delete document.body.dataset.view; });
  $('open-native').addEventListener('click', () => stacki.app.openSettings());
  window.openAppSettings = (which) => {
    if (which) { $('settings-tab').setAttribute('value', which); try { $('settings-tab').value = which; } catch {} }
    document.body.dataset.view = 'settings';
    tab();
  };
  $('add-card').addEventListener('click', () => window.openAppSettings('cards'));
  apply();
})();

/* ---------- Draggable cards: order is remembered on this computer ---------- */
(function cardOrder() {
  const grid = document.querySelector('.cards');
  const KEY = 'card-order';
  const cards = () => [...grid.querySelectorAll(':scope > .card')];
  const idOf = (c) => c.dataset.card;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cards().map(idOf))); } catch {} };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
    for (const id of saved) { const c = cards().find((x) => idOf(x) === id); if (c) grid.append(c); }
  } catch {}
  for (const card of cards()) {
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'handle';
    handle.title = 'Drag to reorder (or use the arrow keys)';
    handle.setAttribute('aria-label', `Move ${card.querySelector('h2').textContent}`);
    handle.textContent = '⋮⋮';
    card.querySelector('.tools').append(handle);
    handle.addEventListener('keydown', (e) => {
      const list = cards().filter((x) => !x.hidden);
      const i = list.indexOf(card);
      const to = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? i - 1 : e.key === 'ArrowDown' || e.key === 'ArrowRight' ? i + 1 : null;
      if (to === null || to < 0 || to >= list.length) return;
      e.preventDefault();
      grid.insertBefore(card, to < i ? list[to] : list[to].nextSibling);
      handle.focus();
      save();
    });
    handle.addEventListener('mousedown', () => { card.draggable = true; });
    for (const ev of ['mouseup', 'dragend']) handle.addEventListener(ev, () => { card.draggable = false; });
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', idOf(card));
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); card.draggable = false; save(); });
  }
  grid.addEventListener('dragover', (e) => {
    const drag = grid.querySelector('.dragging');
    if (!drag) return;
    e.preventDefault();
    const over = cards().filter((c) => c !== drag).find((c) => {
      const r = c.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    if (!over) return;
    const before = cards().indexOf(drag) > cards().indexOf(over);
    grid.insertBefore(drag, before ? over : over.nextSibling);
  });
  grid.addEventListener('drop', (e) => e.preventDefault());
  grid.append($('add-card'));
})();

$('range').addEventListener('change', load);
$('compare').addEventListener('change', load);
$('refresh').addEventListener('click', load);
$('settings').addEventListener('click', () => window.openAppSettings());
$('open-settings').addEventListener('click', () => stacki.app.openSettings());
stacki.on('settings.change', load);

load();
