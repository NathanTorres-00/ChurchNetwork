/** Site name. Appended to every page title and used as `og:site_name`. */
export const SITE_NAME = "The Rock Network";
/** Fallback meta description for pages that don't set their own. Built from Home's hero copy (the old pages had no meta description). */
export const SITE_DESCRIPTION =
  "A New Testament Church Network. Multiplying disciples, leaders, churches, and movements.";
/** Canonical origin. Resolves canonical URLs, social images, and the sitemap. */
export const SITE_URL = "https://therocknetwork.com";
/** BCP 47 locale tag used to format dates and numbers. */
export const SITE_LOCALE = "en-US";
/** Routes excluded from search and the sitemap. Surrounding slashes are ignored. */
export const NOINDEX_ROUTES: string[] = ["/404"];
