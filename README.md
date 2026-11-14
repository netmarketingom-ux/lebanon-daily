# Lebanon Daily | لبنان اليوم

A simple website for Lebanon showing gold and silver prices, exchange rates, today's fuel prices
and the day's news. Gold, exchange rates and news update themselves; you only edit the fuel prices.
It works in Arabic (the default, right-to-left) and English.

## Files

| File         | What it is                                                         |
|--------------|--------------------------------------------------------------------|
| `index.html` | The page layout: header, the cards and the footer              |
| `style.css`  | Colours, sizes and layout (built for phones first)                 |
| `app.js`     | Loads the data, fills in the numbers, draws the chart, switches language |
| `data.json`  | **Fuel prices and the LBP rate. You edit this file by hand.**      |
| `markets.json` | Gold, silver and exchange rates. Written automatically, don't edit |
| `news.json`  | The news headlines. Written automatically (or edit by hand)        |
| `agent/update-markets.mjs` | Fetches gold, silver and exchange rates (see "Automatic prices") |
| `agent/update-news.mjs` | Collects the news from RSS feeds (see "Automatic news") |
| `.github/workflows/update-data.yml` | Runs both updaters on GitHub every hour |
| `package.json` | Only adds the `npm run update-...` commands. Nothing to install.  |

## How to open and test it on your computer

The page reads its `.json` files with JavaScript. Browsers block this when you double-click
`index.html` (the address starts with `file://`), so you will see an error message.
Run a small local server instead. Pick **one** of these:

**Option A: VS Code (easiest)**
1. Install the free **Live Server** extension.
2. Open the `lebanon-daily` folder in VS Code.
3. Right-click `index.html` and choose **Open with Live Server**.
4. The site opens in your browser and reloads every time you save a file.

**Option B: Python (already installed on most Macs and Linux)**
1. Open a terminal in the `lebanon-daily` folder.
2. Run: `python3 -m http.server 8000` (on Windows: `py -m http.server 8000`)
3. Open http://localhost:8000 in your browser.
4. Press `Ctrl + C` in the terminal to stop it.

**Option C: Node.js**
Run `npx serve` in the folder and open the address it prints.

### Test it on your phone
1. Make sure your phone and computer are on the same Wi-Fi.
2. Start the server with Option B.
3. Find your computer's local IP address (for example `192.168.1.20`).
4. On your phone, open `http://192.168.1.20:8000`.

You can also use your browser's phone preview: press `F12`, then the phone/tablet icon.

### What to check
- The page opens in Arabic, right-to-left.
- The **English** button switches everything to English, and the choice is remembered.
- Change a number in `data.json`, save, and refresh the page: the new number appears.

## Updating the fuel prices (by hand)

Open `data.json` and change the numbers. Keep the commas, quotes and brackets exactly as they are.

```json
{
  "lbpRate": 89500,                      <- LBP for 1 US dollar (shown in the exchange rates card)
  "fuel": {
    "lastUpdated": "2026-11-03T08:00:00",  <- date and time: YYYY-MM-DDTHH:MM:SS
    "gasoline95": 1450000,               <- prices in LBP, no commas inside the numbers
    "gasoline98": 1490000,
    "diesel": 1320000,
    "gasCylinder": 1080000
  }
}
```

If the page shows an error after editing, you probably broke the JSON format
(a missing comma is the usual cause). Paste the file into https://jsonlint.com to find the mistake.

## Automatic prices (free, no API key)

`markets.json` is rewritten every hour by `agent/update-markets.mjs`:

- **Gold and silver** come from https://gold-api.com: the live international price per ounce
  in US dollars. The website works out the price per gram for 24k, 21k and 18k gold
  (24k = ounce price ÷ 31.1; 21k = 21/24 of that; 18k = 18/24). Shop prices in Lebanon are
  higher because they include workmanship; the card says so.
- **Exchange rates** come from https://frankfurter.dev: the official daily rates of the
  European Central Bank, published once per working day (none at weekends).
- **The change** (▲ / ▼ %) compares with the day before.
- **The gold chart:** gold-api.com only gives today's price, so the updater keeps its own
  history, one price per day. The chart appears on the second day and shows a full week
  after 7 days.
- If a source is down, its old numbers stay on the site.

To change which currencies are shown, edit `CURRENCIES` at the top of `agent/update-markets.mjs`
(any currency the European Central Bank publishes, e.g. JPY or SEK), and add its name in both
languages to `currencies` in the `TEXT` object in `app.js`.

These are prices for information only. The site does not give buy/sell advice.

## Automatic news (free, from RSS feeds)

The News card is filled from `news.json`. A small script keeps that file up to date:

1. Every hour GitHub runs `agent/update-news.mjs` (see `.github/workflows/update-data.yml`).
2. The script reads the free RSS headline feeds of these news websites:
   - **Arabic:** LBCI, An-Nahar, BBC Arabic, Al Jazeera
   - **English:** LBCI, BBC News, Al Jazeera
3. It keeps only Lebanon stories from the last 48 hours: from LBCI and An-Nahar, only their
   Lebanon sections; from BBC and Al Jazeera, only stories that mention Lebanon or Beirut.
4. It saves up to 8 headlines per language, newest first, with at most 4 from each site.
   Arabic visitors see the Arabic headlines; English visitors see the English ones.
5. If no feed can be read, the old news stays on the site unchanged.

Nothing to set up and nothing to pay: it starts working as soon as these files are on GitHub.
To test it right away: **Actions → Update data → Run workflow**.

Note: English Lebanon news is thinner than Arabic (sometimes only 1 or 2 headlines),
because fewer English sites offer a feed that robots may read.

### Changing what it shows

All the settings are at the top of `agent/update-news.mjs`:
- `ITEMS_PER_LANGUAGE`, `MAX_PER_SOURCE`, `MAX_AGE_HOURS`: how many and how old.
- `FEEDS`: the list of news feeds. To add a site, find its RSS address (often
  `site.com/rss` or `site.com/feed`) and copy one of the existing lines.
- `LEBANON_WORDS`: the words that mark a story from an international site as Lebanon news.

To change how often it runs, edit the `cron` line in `.github/workflows/update-data.yml`.

### Run it on your own computer (optional)

You need Node.js 18 or newer (https://nodejs.org). In the project folder run:

```
npm run update-markets
npm run update-news
```

Then refresh the website to see the new prices and headlines.

## Changing the wording

All the text in both languages is in the `TEXT` object near the top of `app.js`.

## Connecting other data sources later

The website only reads three files (`data.json`, `markets.json`, `news.json`); the addresses
are at the top of `app.js` and all loading happens in the `loadJson()` function.
The simplest way to add a new source, for example official fuel prices, is the same pattern
used for gold and news: a small script in `agent/` that writes the file, plus a line in
`.github/workflows/update-data.yml` to run it. The website code doesn't need to change.

## Publishing it for free

Because it is plain HTML, CSS and JS, it works on any static host. With GitHub Pages:
**Settings → Pages → Deploy from a branch → `main` / root → Save.**
