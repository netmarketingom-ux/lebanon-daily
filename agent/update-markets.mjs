/* =========================================================
   Lebanon Daily - market prices updater (free, no API key)
   Fetches gold and silver prices and exchange rates,
   and writes them to markets.json.

     Gold & silver:  https://gold-api.com   (live international price, in US dollars)
     Exchange rates: https://www.exchangerate-api.com (free "open access" rates, updated once a day;
                     their terms ask for a credit link on the site, which the page shows)

   Run it:   npm run update-markets      (needs Node.js 18 or newer)
   On GitHub it runs by itself (see .github/workflows/update-data.yml).

   Safety: if one source fails, its old numbers are kept unchanged.
   ========================================================= */

import { readFileSync, writeFileSync } from "node:fs";


/* ---------- 1. Settings you can change ---------- */

// Currencies to show, as "1 US dollar = ... of this currency", in two groups.
// Any 3-letter currency code works (JPY, CNY, SEK, ...). Add its name in app.js too.
const MAIN_CURRENCIES = ["EUR", "GBP", "CHF", "TRY", "CAD", "AUD"];
const ARAB_CURRENCIES = [
  "SAR", "AED", "KWD", "QAR", "BHD", "OMR",   // Gulf
  "JOD", "IQD", "SYP", "EGP", "YER",          // Levant, Iraq, Egypt, Yemen
  "SDG", "LYD", "TND", "DZD", "MAD", "MRU",   // Sudan and North Africa
  "SOS", "DJF", "KMF",                        // Somalia, Djibouti, Comoros
];
// (The Lebanese pound is shown from data.json, because its rate is fixed.)

// How many days to keep for the charts
const HISTORY_DAYS = 7;

// Where to save (relative to the project folder)
const MARKETS_FILE = "markets.json";


/* ---------- 2. Helpers ---------- */

async function getJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "LebanonDaily-PriceBot/1.0 (+https://github.com/netmarketingom-ux/lebanon-daily)" },
    signal: AbortSignal.timeout(20000), // give up after 20 seconds
  });
  if (!response.ok) throw new Error("HTTP " + response.status + " from " + url);
  return response.json();
}

// The previous markets.json, or an empty start if there is none yet
function readOldFile() {
  try {
    return JSON.parse(readFileSync(MARKETS_FILE, "utf8"));
  } catch {
    return { metals: null, forex: null };
  }
}

// "2026-11-14" for a date (in UTC)
function dayOf(date) {
  return date.toISOString().slice(0, 10);
}


/* ---------- 3. Gold and silver ---------- */

// gold-api.com only gives today's price, so we build the 7-day history
// ourselves: one entry per day, holding that day's latest price.
async function updateMetals(old) {
  const gold = await getJson("https://api.gold-api.com/price/XAU");
  const silver = await getJson("https://api.gold-api.com/price/XAG");
  if (!(gold.price > 0) || !(silver.price > 0)) throw new Error("Unexpected metal prices");

  const today = dayOf(new Date());
  const history = (old && old.history ? old.history : []).filter((day) => day.date !== today);
  history.push({ date: today, gold: round(gold.price, 2), silver: round(silver.price, 3) });

  return {
    updatedAt: new Date().toISOString(),
    gold: round(gold.price, 2),     // US dollars per troy ounce (31.1 grams)
    silver: round(silver.price, 3), // US dollars per troy ounce
    history: history.slice(-HISTORY_DAYS),
  };
}


/* ---------- 4. Exchange rates ---------- */

// The free rates come once a day with no history, so (like gold) we keep
// our own: one entry per day, used for the "change since the day before".
async function updateForex(old) {
  const data = await getJson("https://open.er-api.com/v6/latest/USD");
  if (data.result !== "success") throw new Error("Exchange rate service said: " + data.result);

  const rates = {};
  for (const code of MAIN_CURRENCIES.concat(ARAB_CURRENCIES)) {
    if (data.rates[code] > 0) rates[code] = data.rates[code];
    else console.warn("No rate for " + code);
  }

  const date = dayOf(new Date(data.time_last_update_unix * 1000)); // the day these rates are for
  // Start a fresh history if the old file used a different source
  const oldHistory = old && old.source === "exchangerate-api" && old.history ? old.history : [];
  const history = oldHistory.filter((day) => day.date !== date);
  history.push({ date, ...rates });
  const previous = history.length >= 2 ? history[history.length - 2] : null;

  return {
    source: "exchangerate-api",
    updatedAt: new Date().toISOString(),
    date,
    main: MAIN_CURRENCIES.filter((code) => rates[code]),
    arab: ARAB_CURRENCIES.filter((code) => rates[code]),
    rates,
    previous,             // the day before (for the change), or null at first
    history: history.slice(-HISTORY_DAYS),
  };
}


function round(n, decimals) {
  return Number(n.toFixed(decimals));
}


/* ---------- 5. Run ---------- */

async function main() {
  const old = readOldFile();
  const result = { metals: old.metals, forex: old.forex };
  let failures = 0;

  try {
    result.metals = await updateMetals(old.metals);
    console.log("Gold: $" + result.metals.gold + ", silver: $" + result.metals.silver + " per ounce");
  } catch (error) {
    failures++;
    console.warn("Could not update gold/silver (keeping old numbers): " + error.message);
  }

  try {
    result.forex = await updateForex(old.forex);
    console.log("Exchange rates for " + result.forex.date + ": " + Object.keys(result.forex.rates).length + " currencies");
  } catch (error) {
    failures++;
    console.warn("Could not update exchange rates (keeping old numbers): " + error.message);
  }

  if (failures === 2) {
    throw new Error("Both sources failed, markets.json not changed");
  }
  writeFileSync(MARKETS_FILE, JSON.stringify(result, null, 2) + "\n");
  console.log("Saved " + MARKETS_FILE);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1); // GitHub shows the run as failed
});
