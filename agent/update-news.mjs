/* =========================================================
   Lebanon Daily - news updater (RSS, no AI, free)
   Reads the free RSS headline feeds of several news websites,
   keeps the Lebanon stories, and writes them to news.json.
   Arabic feeds fill the Arabic version of the site,
   English feeds fill the English version.

   Run it:   npm run update-news      (needs Node.js 18 or newer)
   On GitHub it runs by itself (see .github/workflows/update-news.yml).

   Safety: if no feed can be read, the old news.json is kept
   unchanged, so the website never shows empty news.
   ========================================================= */

import { writeFileSync } from "node:fs";


/* ---------- 1. Settings you can change ---------- */

// How many headlines to show per language
const ITEMS_PER_LANGUAGE = 8;

// At most this many headlines from the same website, so the list stays varied
const MAX_PER_SOURCE = 4;

// Ignore stories older than this many hours
const MAX_AGE_HOURS = 48;

// The feeds to read.
//   lang:          which version of the site it appears on ("ar" or "en")
//   onlyLinksWith: keep only stories whose link contains one of these parts
//                  (Lebanese sites put the section name in the link, e.g. /lebanon/)
//   onlyLebanon:   true = keep only stories that mention Lebanon
//                  (for international sites that cover the whole world)
const FEEDS = [
  // Lebanese news sites: only their Lebanon sections
  { name: "LBCI",       lang: "ar", url: "https://www.lbcgroup.tv/Rss/latest-news/ar", onlyLinksWith: ["/news/lebanon"] },
  { name: "LBCI",       lang: "en", url: "https://www.lbcgroup.tv/Rss/latest-news/en", onlyLinksWith: ["/news/lebanon"] },
  { name: "النهار",      lang: "ar", url: "https://www.annahar.com/rss",                onlyLinksWith: ["/lebanon/"] },
  // International news sites (Lebanon stories only)
  { name: "BBC عربي",    lang: "ar", url: "https://feeds.bbci.co.uk/arabic/rss.xml",    onlyLebanon: true },
  { name: "BBC News",   lang: "en", url: "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml", onlyLebanon: true },
  { name: "الجزيرة",     lang: "ar", url: "https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bfdff8b8cab9", onlyLebanon: true },
  { name: "Al Jazeera", lang: "en", url: "https://www.aljazeera.com/xml/rss/all.xml",   onlyLebanon: true },
];

// Words that mean a story is about Lebanon (used when onlyLebanon is true).
// Avoid short words that hide inside other words (e.g. "صور" is inside "العصور"),
// and words that also exist elsewhere (e.g. Iraq also has a "Hezbollah").
const LEBANON_WORDS = [
  "Lebanon", "Lebanese", "Beirut", "Bekaa", "Sidon",
  "لبنان", "بيروت", "البقاع", "صيدا",
];

// Where to save the news (relative to the project folder)
const NEWS_FILE = "news.json";


/* ---------- 2. Reading one feed ---------- */

// Download a feed and turn each <item> into { title, summary, url, publishedAt }.
async function readFeed(feed) {
  const response = await fetch(feed.url, {
    headers: { "User-Agent": "LebanonDaily-NewsBot/1.0 (+https://github.com/netmarketingom-ux/lebanon-daily)" },
    signal: AbortSignal.timeout(20000), // give up after 20 seconds
  });
  if (!response.ok) throw new Error("HTTP " + response.status);
  const xml = await response.text();

  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/g) || [];
  return items.map((item) => ({
    title: cleanText(getTag(item, "title")),
    summary: shorten(cleanText(getTag(item, "description")), 150),
    url: cleanLink(cleanText(getTag(item, "link"))),
    publishedAt: toIsoDate(getTag(item, "pubDate")),
  }));
}

// The text inside <tag>...</tag> (or "" if missing)
function getTag(xml, tag) {
  const match = xml.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">"));
  return match ? match[1] : "";
}

// Remove CDATA wrappers, HTML tags and codes like &amp; so only plain text is left
function cleanText(text) {
  let s = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  s = s.replace(/<[^>]*>/g, " ");          // HTML tags
  for (let i = 0; i < 2; i++) {             // twice, some feeds encode codes twice
    s = s
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&");
  }
  return s.replace(/\s+/g, " ").trim();
}

// Cut long text at a word boundary and add "..."
function shorten(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, text.lastIndexOf(" ", maxLength)) + "…";
}

// Remove tracking codes (utm_..., src=rss) from links
function cleanLink(link) {
  try {
    const url = new URL(link);
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || key === "src" || key === "at_medium" || key === "at_campaign" || key === "traffic_source") {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return "";
  }
}

// Any date format -> "2026-11-14T10:29:25.000Z" (or "" if it can't be read)
function toIsoDate(text) {
  const date = new Date(cleanText(text));
  return isNaN(date) ? "" : date.toISOString();
}


/* ---------- 3. Choosing the stories ---------- */

function isAboutLebanon(item) {
  const text = item.title + " " + item.summary;
  return LEBANON_WORDS.some((word) => text.includes(word));
}

function isRecent(item) {
  const ageHours = (Date.now() - new Date(item.publishedAt)) / 3600000;
  return ageHours >= -1 && ageHours <= MAX_AGE_HOURS; // -1 allows small clock differences
}

// Newest first, no repeats, at most MAX_PER_SOURCE per website
function pickStories(items) {
  items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const picked = [];
  const perSource = {};
  const seen = new Set();
  for (const item of items) {
    if (picked.length >= ITEMS_PER_LANGUAGE) break;
    if (seen.has(item.url) || seen.has(item.title)) continue;
    if ((perSource[item.source] || 0) >= MAX_PER_SOURCE) continue;
    picked.push(item);
    seen.add(item.url);
    seen.add(item.title);
    perSource[item.source] = (perSource[item.source] || 0) + 1;
  }
  return picked;
}


/* ---------- 4. Run ---------- */

async function main() {
  const all = [];
  let feedsRead = 0;

  for (const feed of FEEDS) {
    try {
      const items = await readFeed(feed);
      feedsRead++;
      const kept = items.filter((item) =>
        item.title &&
        item.url.startsWith("https://") &&
        item.publishedAt && isRecent(item) &&
        (!feed.onlyLinksWith || feed.onlyLinksWith.some((part) => item.url.includes(part))) &&
        (!feed.onlyLebanon || isAboutLebanon(item))
      );
      console.log(feed.name + " (" + feed.lang + "): " + items.length + " stories, kept " + kept.length);
      kept.forEach((item) => all.push({ lang: feed.lang, source: feed.name, ...item }));
    } catch (error) {
      // One broken feed should not stop the others
      console.warn("Could not read " + feed.name + " (" + feed.url + "): " + error.message);
    }
  }

  if (feedsRead === 0) {
    throw new Error("No feed could be read, keeping the old news.json");
  }

  const items = [
    ...pickStories(all.filter((item) => item.lang === "ar")),
    ...pickStories(all.filter((item) => item.lang === "en")),
  ];
  if (items.length === 0) {
    throw new Error("No recent Lebanon stories found, keeping the old news.json");
  }

  const news = { lastUpdated: new Date().toISOString(), items };
  writeFileSync(NEWS_FILE, JSON.stringify(news, null, 2) + "\n");
  console.log("Saved " + items.length + " headlines to " + NEWS_FILE);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1); // news.json was not touched; GitHub shows the run as failed
});
