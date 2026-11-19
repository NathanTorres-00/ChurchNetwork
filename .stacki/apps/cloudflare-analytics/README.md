# Cloudflare Analytics

Your Cloudflare traffic inside Stacki, with a focus on one question: **which AI crawlers read your site, and how much of your traffic are they?** Pageviews and visits, humans vs AI, referrers and top pages, each compared with the previous period. No server, nothing to host.

## What you see

**Top row.** Five big numbers, always with a small change against the previous period of the same length (24 h vs the 24 h before, 7 days vs 7 days, 30 days vs 30 days):

- **Pageviews** and **Total visits**, with sparklines (Cloudflare Web Analytics)
- **Human page views**, **AI page views** and **AI share**

**Human vs AI.** One bar with three colours: humans, AI crawlers and everything else (other bots, ad traffic). Each colour has a label.

**Cards.** They sit side by side when there is room, and you can drag them into your own order (or use the arrow keys on the handle). The order is remembered.

| Card | Shows |
|---|---|
| AI crawlers | ChatGPT, Claude, Perplexity, Gemini, Meta, Apple and more, by crawler |
| Why AI crawlers come | Training, Search, or a user asking an AI about your page |
| Bots by type, Top bots | Everything else that is not a person |
| Top pages | Most viewed paths (Web Analytics) |
| Channels | Direct, Search, Social, Referral, AI |
| Top referrers | Where visitors come from (Web Analytics) |
| Countries, Devices, Browsers | Who the human visitors are (humans only) |

A switch above the cards compares them with the previous period as well. The top numbers always compare.

## Settings

Press the gear in the header. The in-app settings have two tabs:

- **Connection:** opens Stacki's app settings, where your API token, zone ID, account ID and hostnames live.
- **Cards:** an on/off toggle for every card. Switch off the ones you don't want on your dashboard, and switch them on again whenever you like.

**Move cards around.** Drag a card by its ⋮⋮ handle to put it where you want it, or focus the handle and use the arrow keys. The order is remembered.

**Hide a card.** Use the ⋯ menu in a card's top corner, next to the ⋮⋮ drag handle, and choose **Hide card**. Its toggle in the settings goes off at the same time.

**Add a card back.** While a card is hidden, a dashed **+** tile sits last in the card grid. Click it to open the Cards tab, or use **Show all cards** to bring everything back.

Your choices are remembered on this computer.

## Install

In Stacki: **Load App From GitHub** → `uebersaxsamuel/stacki` → `cloudflare-analytics`. Or download `cloudflare-analytics.zip` from the [latest release](https://github.com/uebersaxsamuel/stacki/releases/latest) and use **Upload app file → Install → Open**.

## Setup

Create a custom API token at dash.cloudflare.com → My Profile → API Tokens with two read policies:

1. **Zone → Analytics → Read** for your zone
2. **Account → Account Analytics → Read** for your account (needed for pageviews, visits, referrers and top pages)

Then enter these in the app settings:

| Setting | Where to find it |
|---|---|
| Cloudflare API token | the token you just created (stored as a secret) |
| Zone ID | your domain → Overview → API → Zone ID |
| Account ID | Account home → ⋯ next to your account → Copy account ID |
| Hostnames (optional) | e.g. `example.com,www.example.com`. Limits the data to these hosts and hides your own site from the referrers |

## How it works

- Reads the **Cloudflare GraphQL Analytics API** (`api.cloudflare.com`, the only host the app contacts) with `stacki.net.fetch`.
- **Pageviews, visits, referrers, top pages** come from Web Analytics (`rumPageloadEventsAdaptiveGroups`). These are counted in the browser, so they match your Cloudflare dashboard.
- **AI and bot traffic** comes from the request log (`httpRequestsAdaptiveGroups`), classified by user agent. Cloudflare samples this data, so treat it as a close estimate, not an exact count.
- **Free plan friendly.** Fields your plan blocks are dropped automatically and that card shows what is missing, instead of an error.
- **Private.** The token stays in Stacki's secret storage. Only the card order is kept in the browser.

## Limits

- The numbers can differ from Cloudflare's dashboard: Web Analytics counts real browsers, the request log also counts bots and is sampled.
- AI crawlers are recognised by user agent. A crawler that hides its identity looks like a normal visitor.
- 24 h, 7 days and 30 days are available.
