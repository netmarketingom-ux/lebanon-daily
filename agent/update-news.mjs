/* =========================================================
   Lebanon Daily - news agent
   Asks Claude to search the web for today's Lebanon news and
   writes the result to news.json (titles and short summaries
   in Arabic and English, each with a link to its source).

   Run it:   ANTHROPIC_API_KEY=your-key npm run update-news
   On GitHub it runs by itself (see .github/workflows/update-news.yml).

   Safety: if anything goes wrong, the old news.json is kept
   unchanged, so the website never shows broken or empty news.
   ========================================================= */

import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "node:fs";


/* ---------- 1. Settings you can change ---------- */

// How many news items to show on the site
const NUMBER_OF_ITEMS = 6;

// Claude may only search these news websites.
// Add or remove sites here (just the domain, no https://).
const NEWS_SITES = [
  "nna-leb.gov.lb",        // National News Agency (official)
  "lorientlejour.com",     // L'Orient-Le Jour / L'Orient Today
  "naharnet.com",
  "annahar.com",
  "lbcgroup.tv",
  "mtv.com.lb",
  "aljadeed.tv",
  "reuters.com",
  "apnews.com",
  "aljazeera.com",
  "aljazeera.net",
  "bbc.com",
];

// The Claude model that does the work
const MODEL = "claude-opus-5-5";

// Where to save the news (relative to the project folder)
const NEWS_FILE = "news.json";


/* ---------- 2. The instructions for Claude ---------- */

const today = new Date().toISOString().slice(0, 10); // e.g. "2026-11-08"

const INSTRUCTIONS = `Today is ${today}. You are the news editor of "Lebanon Daily", a simple website
that Lebanese people check on their phones for the dollar rate, fuel prices and the day's news.

Use web search to find the ${NUMBER_OF_ITEMS} most important Lebanon news stories from the last 24-48 hours.
Prefer stories that matter in daily life: the economy and prices, banks, electricity and fuel,
government decisions, security alerts, weather and road conditions, schools.

Rules:
- Only include stories you actually found in your search results. Never invent a story, a number or a quote.
- The url must be the exact address of the article you found.
- Write neutrally and factually: report what happened and who said it, with no opinions or loaded words.
- Each title: one short line. Each summary: one or two short sentences.
- Write every title and summary in both Modern Standard Arabic and English.
- If the same story appears on several sites, include it once.

When you are done, call the save_news tool once with your final list.`;


/* ---------- 3. The shape of the answer ---------- */

// Claude must hand back its result through this "tool", which forces
// the answer into exactly the structure that news.json uses.
const bilingualText = {
  type: "object",
  properties: { ar: { type: "string" }, en: { type: "string" } },
  required: ["ar", "en"],
  additionalProperties: false,
};

const saveNewsTool = {
  name: "save_news",
  description: "Save the final list of news stories to the website.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: bilingualText,
            summary: bilingualText,
            source: { type: "string", description: "Name of the news website, e.g. Naharnet" },
            url: { type: "string", description: "Exact article URL from the search results" },
            publishedAt: { type: "string", description: "Publication date as YYYY-MM-DD" },
          },
          required: ["title", "summary", "source", "url", "publishedAt"],
          additionalProperties: false,
        },
      },
    },
    required: ["items"],
    additionalProperties: false,
  },
};

const webSearchTool = {
  type: "web_search_20260209",
  name: "web_search",
  max_uses: 8,                 // limits cost: at most 8 searches per run
  allowed_domains: NEWS_SITES,
};


/* ---------- 4. Ask Claude ---------- */

async function askClaude() {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
  const messages = [{ role: "user", content: INSTRUCTIONS }];
  const allContent = []; // everything Claude returned, used to check the links later

  // Web searches can make Claude "pause" a long turn; we simply send it back
  // so it continues. At most 5 rounds, so it can never loop forever.
  for (let round = 1; round <= 5; round++) {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium" },
      tools: [webSearchTool, saveNewsTool],
      messages,
      // If a request is declined by a safety check, retry on a fallback model
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    allContent.push(...response.content);

    const saveCall = response.content.find(
      (block) => block.type === "tool_use" && block.name === "save_news"
    );
    if (saveCall) {
      return { items: saveCall.input.items, allContent };
    }

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    if (response.stop_reason === "refusal") {
      throw new Error("Claude declined the request: " + JSON.stringify(response.stop_details));
    }
    throw new Error("Claude finished without saving news (stop_reason: " + response.stop_reason + ")");
  }
  throw new Error("Claude did not finish within 5 rounds");
}


/* ---------- 5. Check the answer ---------- */

// Every link that appeared in the search results.
// Only "..._tool_result" blocks count: those come from the search itself,
// not from Claude's own writing, so a made-up link can never pass.
function findAllUrls(content) {
  const results = content.filter((block) => block.type.endsWith("_tool_result"));
  const text = JSON.stringify(results);
  return new Set((text.match(/https?:\/\/[^\s"\\<>]+/g) || []).map(normalizeUrl));
}

function normalizeUrl(url) {
  return url.replace(/[#?].*$/, "").replace(/\/+$/, "").toLowerCase();
}

// Keep only items that look right and whose link really came from a search result.
function checkItems(items, allContent) {
  const seenUrls = findAllUrls(allContent);
  const good = [];

  for (const item of items) {
    const url = item.url.trim();
    const problems = [];
    if (!url.startsWith("https://")) problems.push("link is not https");
    if (!seenUrls.has(normalizeUrl(url))) problems.push("link was not in the search results");
    if (!item.title.ar.trim() || !item.title.en.trim()) problems.push("missing title");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.publishedAt)) problems.push("bad date");

    if (problems.length > 0) {
      console.warn("Skipping \"" + item.title.en + "\": " + problems.join(", "));
    } else {
      good.push({ ...item, url });
    }
  }
  return good.slice(0, NUMBER_OF_ITEMS);
}


/* ---------- 6. Run ---------- */

async function main() {
  console.log("Asking Claude for today's news...");
  const { items, allContent } = await askClaude();
  const goodItems = checkItems(items, allContent);

  if (goodItems.length === 0) {
    throw new Error("No usable news items, keeping the old news.json");
  }

  const news = {
    lastUpdated: new Date().toISOString(), // e.g. "2026-11-08T07:00:00.000Z" (Z = UTC; the site shows local time)
    items: goodItems,
  };
  writeFileSync(NEWS_FILE, JSON.stringify(news, null, 2) + "\n");
  console.log("Saved " + goodItems.length + " news items to " + NEWS_FILE + ":");
  goodItems.forEach((item) => console.log(" - " + item.title.en + " (" + item.source + ")"));
}

main().catch((error) => {
  if (error instanceof Anthropic.AuthenticationError) {
    console.error("The API key is missing or wrong. Set ANTHROPIC_API_KEY.");
  } else if (error instanceof Anthropic.RateLimitError) {
    console.error("Rate limited by the API. It will try again next time.");
  } else if (error instanceof Anthropic.APIError) {
    console.error("API error " + error.status + ": " + error.message);
  } else {
    console.error(error.message);
  }
  // news.json was not touched; exit with an error so GitHub shows the run as failed
  process.exit(1);
});
