/* =========================================================
   Lebanon Daily - market prices updater (free, no API key)
   Fetches gold and silver prices and exchange rates,
   and writes them to markets.json.

     Gold & silver:  https://gold-api.com   (live international price, in US dollars)
     Exchange rates: https://frankfurter.dev (official daily rates of the European Central Bank)

   Run it:   npm run update-markets      (needs Node.js 18 or newer)
   On GitHub it runs by itself (see .github/workflows/update-data.yml).

   Safety: if one source fails, its old numbers are kept unchanged.
   ========================================================= */

import { readFileSync, writeFileSync } from "node:fs";


/* ---------- 1. Settings you can change ---------- */

// Currencies to show, as "1 US dollar = ... of this currency".
// Any code the European Central Bank publishes works (EUR, GBP, CHF, TRY, CAD, AUD, JPY, ...).
const CURRENCIES = ["EUR", "GBP", "CHF", "TRY", "CAD", "AUD"];

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

// Frankfurter gives a range of days, so the history comes ready-made.
// The European Central Bank publishes once per working day (around 4pm in Frankfurt).
async function updateForex() {
  const start = dayOf(new Date(Date.now() - 14 * 24 * 3600 * 1000)); // two weeks back covers weekends
  const data = await getJson(
    "https://api.frankfurter.dev/v1/" + start + "..?base=USD&symbols=" + CURRENCIES.join(",")
  );

  const days = Object.keys(data.rates).sort().slice(-HISTORY_DAYS);
  if (days.length < 2) throw new Error("Not enough exchange rate data");
  const history = days.map((date) => ({ date, ...data.rates[date] }));

  return {
    updatedAt: new Date().toISOString(),
    date: days[days.length - 1],                 // the day these rates are for
    rates: data.rates[days[days.length - 1]],    // latest
    previous: data.rates[days[days.length - 2]], // the working day before (for the change)
    history,
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
    result.forex = await updateForex();
    console.log("Exchange rates for " + result.forex.date + ": " + JSON.stringify(result.forex.rates));
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
