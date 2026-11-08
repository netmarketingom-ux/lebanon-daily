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
| `news.json`  | The news. Written automatically by the news agent (or edit by hand) |
| `agent/update-news.mjs` | The AI news agent (see "Automatic news" below)          |
| `.github/workflows/update-news.yml` | Runs the agent on GitHub 3 times a day     |
| `package.json` | Only used by the news agent. The website itself needs no install. |

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

## Automatic news (AI agent)

The News card is filled from `news.json`. An AI agent keeps that file up to date:

1. GitHub runs `agent/update-news.mjs` at about 7am, 1pm and 7pm Beirut time.
2. The agent asks Claude (Anthropic's AI) to search a fixed list of news websites
   for the most important Lebanon stories from the last day or two.
3. Claude writes a short title and summary for each story, in Arabic and English,
   with a link to the original article.
4. The agent checks every story: the link must be `https://` and must have come from
   a real search result, otherwise the story is dropped. This stops made-up stories.
5. If everything is fine, the new `news.json` is saved and committed, and the site shows it.
   If anything fails, the old news stays on the site unchanged.

### One-time setup

1. Get an API key at https://platform.claude.com (Settings → API keys) and add some credit.
   Each run pays for up to 8 web searches plus Claude reading the results and writing,
   usually somewhere around $0.10–0.40 a run, so very roughly $10–35 a month at 3 runs a day.
   Check the real cost in the console after a few days; to spend less, run it once a day
   (edit the `cron` line) or lower `max_uses` in the agent.
2. In this repository on GitHub: **Settings → Secrets and variables → Actions →
   New repository secret**. Name: `ANTHROPIC_API_KEY`, value: your key.
3. Test it: **Actions → Update news → Run workflow**. After a minute or two you should
   see a new "Update news" commit, and the news on the site.

### Changing what it does

All the settings are at the top of `agent/update-news.mjs`:
- `NUMBER_OF_ITEMS`: how many stories to show.
- `NEWS_SITES`: the only websites it is allowed to search. Add or remove sites here.
- `INSTRUCTIONS`: what kind of stories to pick and how to write them, in plain English.

To change how often it runs, edit the `cron` line in `.github/workflows/update-news.yml`
(times are in UTC, which is 2 hours behind Beirut in winter, 3 in summer).

### Run it on your own computer (optional)

You need Node.js (https://nodejs.org). In the project folder:

```
npm install
ANTHROPIC_API_KEY=your-key npm run update-news
```

(On Windows PowerShell: `$env:ANTHROPIC_API_KEY="your-key"; npm run update-news`)

### A word of caution

AI summaries can occasionally get a detail wrong. Every story links to its source,
and the footer reminds visitors to check it. Look at the news now and then, especially
in the first weeks. To remove a story, delete it from `news.json` by hand.

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
