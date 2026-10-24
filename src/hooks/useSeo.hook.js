import { useEffect } from "react";
import { useI18n } from "../contexts/I18n.context";

// Per-screen title, description and indexing rules for a client-rendered app.
//
// index.html carries the landing page's metadata, which is what every link-preview
// scraper reads — they fetch the file and never run the bundle. This hook is for the
// crawlers that *do* render (Google chief among them) and for the browser tab, and it
// exists mostly to say the opposite of index.html: every screen but the landing page
// is somebody's private album or an app surface with nothing to rank for, so the
// default here is `noindex`.
//
// Each page calls it with what it wants; anything left out falls back to the values
// below, so a screen can never inherit the previous screen's title.

export const SITE_NAME = "Sawwerna";
export const SITE_URL = "https://sawwerna.com";

// The defaults live in the string catalogue (seo.defaultTitle / seo.defaultDescription)
// so they are translated like everything else.

// `name` for the standard tags, `property` for Open Graph — scrapers key on the
// attribute, not just the value, so the two cannot be collapsed into one lookup.
function setMeta(key, value, attribute = "name") {
  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`);

  if (!value) {
    return;
  }

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", value);
}

function setCanonical(href) {
  let tag = document.head.querySelector('link[rel="canonical"]');

  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }

  tag.setAttribute("href", href);
}

/**
 * @param {object} options
 * @param {string} [options.title]        Page title, before the site name is appended.
 * @param {string} [options.description]  Meta description. Only meaningful when indexed.
 * @param {boolean} [options.index]       Whether this screen belongs in search results.
 *                                        Defaults to false — see the note above.
 * @param {string} [options.path]         Canonical path, e.g. "/". Only set when indexed:
 *                                        pointing a private URL at a canonical of its own
 *                                        would be an invitation to index it.
 */
export default function useSeo({
  title,
  description,
  index = false,
  path,
} = {}) {
  // The landing page's own title and description are localised too — it is the one
  // screen a crawler is meant to rank, and an Arabic visitor who finds it should find
  // it in Arabic. (index.html still carries the English version for the scrapers that
  // never run the bundle; see the SEO note in CLAUDE.md.)
  const { t, locale } = useI18n();
  const resolvedDescription = description ?? t("seo.defaultDescription");

  useEffect(() => {
    // The landing page passes no title and wants the bare brand line; everywhere else
    // reads better as "Screen · Sawwerna" in a tab strip.
    const fullTitle = title
      ? `${title} · ${SITE_NAME}`
      : t("seo.defaultTitle");

    document.title = fullTitle;
    setMeta("description", resolvedDescription);
    setMeta(
      "robots",
      index
        ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        : "noindex, nofollow",
    );

    // A noindex screen still gets og:title/description so a link pasted into a chat
    // reads sensibly where the scraper happens to render — but never its own
    // canonical, and never an og:url that would advertise a private album.
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", resolvedDescription, "property");

    const canonical = index && path ? `${SITE_URL}${path}` : `${SITE_URL}/`;
    setCanonical(canonical);
    setMeta("og:url", canonical, "property");
  }, [title, resolvedDescription, index, path, locale, t]);
}
