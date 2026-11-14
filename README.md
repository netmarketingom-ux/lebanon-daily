# Lebanon Daily | لبنان اليوم

A simple website that shows the USD to LBP market rate, today's fuel prices and the day's news in Lebanon.
It works in Arabic (the default, right-to-left) and English.

## Files

| File         | What it is                                                         |
|--------------|--------------------------------------------------------------------|
| `index.html` | The page layout: header, the cards and the footer              |
| `style.css`  | Colours, sizes and layout (built for phones first)                 |
| `app.js`     | Loads the data, fills in the numbers, draws the chart, switches language |
| `data.json`  | **The prices. Edit this file to update the site.**                 |
| `news.json`  | The news headlines. Written automatically (or edit by hand)        |
| `agent/update-news.mjs` | Collects the news from RSS feeds (see "Automatic news" below) |
| `.github/workflows/update-news.yml` | Runs the news collector on GitHub every 3 hours |
| `package.json` | Only adds the `npm run update-news` command. Nothing to install.  |

## How to open and test it on your computer

The page reads `data.json` with JavaScript. Browsers block this when you double-click
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

## Updating the prices

Open `data.json` and change the numbers. Keep the commas, quotes and brackets exactly as they are.

```json
"dollar": {
  "rate": 89500,                      <- today's rate (no commas inside the number)
  "lastUpdated": "2026-11-03T09:30:00",  <- date and time: YYYY-MM-DDTHH:MM:SS
  "history": [ ... 7 days of { "date", "rate" } ... ]
}
```

Each day: update `rate` and `lastUpdated`, then add today's entry at the **end** of
`history` and delete the first (oldest) one, so there are always 7 days.

If the page shows an error after editing, you probably broke the JSON format
(a missing comma is the usual cause). Paste the file into https://jsonlint.com to find the mistake.

## Automatic news (free, from RSS feeds)

The News card is filled from `news.json`. A small script keeps that file up to date:

1. Every 3 hours GitHub runs `agent/update-news.mjs` (see `.github/workflows/update-news.yml`).
2. The script reads the free RSS headline feeds of these news websites:
   - **Arabic:** LBCI, An-Nahar, BBC Arabic, Al Jazeera
   - **English:** LBCI, BBC News, Al Jazeera
3. It keeps only Lebanon stories from the last 48 hours: from LBCI and An-Nahar, only their
   Lebanon sections; from BBC and Al Jazeera, only stories that mention Lebanon or Beirut.
4. It saves up to 8 headlines per language, newest first, with at most 4 from each site.
   Arabic visitors see the Arabic headlines; English visitors see the English ones.
5. If no feed can be read, the old news stays on the site unchanged.

Nothing to set up and nothing to pay: it starts working as soon as these files are on GitHub.
To test it right away: **Actions → Update news → Run workflow**.

Note: English Lebanon news is thinner than Arabic (sometimes only 1 or 2 headlines),
because fewer English sites offer a feed that robots may read.

### Changing what it shows

All the settings are at the top of `agent/update-news.mjs`:
- `ITEMS_PER_LANGUAGE`, `MAX_PER_SOURCE`, `MAX_AGE_HOURS`: how many and how old.
- `FEEDS`: the list of news feeds. To add a site, find its RSS address (often
  `site.com/rss` or `site.com/feed`) and copy one of the existing lines.
- `LEBANON_WORDS`: the words that mark a story from an international site as Lebanon news.

To change how often it runs, edit the `cron` line in `.github/workflows/update-news.yml`.

### Run it on your own computer (optional)

You need Node.js 18 or newer (https://nodejs.org). In the project folder run:

```
npm run update-news
```

Then refresh the website to see the new headlines.

## Changing the wording

All the text in both languages is in the `TEXT` object near the top of `app.js`.

## Connecting a real data source later

All loading happens in one place: the `loadData()` function in `app.js`.

- **If you find an API that returns the same JSON shape as `data.json`**, just change
  `DATA_URL` at the top of `app.js` to its address.
- **If the API returns a different shape**, keep `DATA_URL` pointing at it and change
  `loadData()` so it converts the response into the `data.json` shape before returning it.
  The rest of the code does not need to change.
- **Or keep the file**: have a small script or scheduled job write a fresh `data.json`
  on your server every day. The website code stays exactly the same.

## Publishing it for free

Because it is plain HTML, CSS and JS, it works on any static host. With GitHub Pages:
**Settings → Pages → Deploy from a branch → `main` / root → Save.**
