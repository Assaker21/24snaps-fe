import { useEffect } from "react";

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

const DEFAULT_TITLE = "Sawwerna — a disposable camera for your event";
const DEFAULT_DESCRIPTION =
  "Hand your guests a disposable camera that lives in their browser. They join by QR — no app, no download — and the whole album reveals when the event ends.";

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
  description = DEFAULT_DESCRIPTION,
  index = false,
  path,
} = {}) {
  useEffect(() => {
    // The landing page passes no title and wants the bare brand line; everywhere else
    // reads better as "Screen · Sawwerna" in a tab strip.
    const fullTitle = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE;

    document.title = fullTitle;
    setMeta("description", description);
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
    setMeta("og:description", description, "property");

    const canonical = index && path ? `${SITE_URL}${path}` : `${SITE_URL}/`;
    setCanonical(canonical);
    setMeta("og:url", canonical, "property");
  }, [title, description, index, path]);
}
