/* =========================================================
   Lebanon Daily - app.js
   What this file does, in order:
     1. Settings (where the data comes from)
     2. All the words on the page, in Arabic and English
     3. Loading the data
     4. Filling the cards with numbers
     5. Drawing the 7-day chart
     6. The news list
     7. The language button
     8. Starting everything
   ========================================================= */


/* ---------- 1. Settings ---------- */

// Where the prices come from. Today it is the local file data.json.
// Later you can point this at a real API that returns the same shape
// of JSON (see README.md, "Connecting a real data source").
const DATA_URL = 'data.json';

// Where the news comes from. The news agent (agent/update-news.mjs)
// rewrites this file automatically; you can also edit it by hand.
const NEWS_URL = 'news.json';

// Arabic is the default language.
const DEFAULT_LANG = 'ar';


/* ---------- 2. Words in both languages ---------- */

// Each key matches a data-i18n="..." attribute in index.html.
// To change any wording on the site, edit it here.
const TEXT = {
  ar: {
    siteTitle: 'لبنان اليوم',
    dollarTitle: 'سعر الدولار في السوق',
    lbp: 'ل.ل.',
    perDollar: 'مقابل 1 دولار أميركي',
    chartTitle: 'آخر 7 أيام',
    lastUpdated: 'آخر تحديث:',
    fuelTitle: 'أسعار المحروقات اليوم',
    gasoline95: 'بنزين 95 أوكتان',
    gasoline98: 'بنزين 98 أوكتان',
    diesel: 'مازوت',
    gasCylinder: 'قارورة غاز',
    fuelNote: 'الأسعار بالليرة اللبنانية',
    disclaimer: 'الأسعار للاطلاع فقط وقد تختلف من مكان لآخر. العناوين من مواقع الأخبار المذكورة، اضغط على العنوان لقراءة الخبر كاملاً.',
    newsTitle: 'أخبار اليوم',
    newsEmpty: 'لا توجد أخبار حالياً.',
    switchTo: 'English',
    pageTitle: 'لبنان اليوم',
    error: 'تعذّر تحميل الأسعار. إذا فتحت الملف مباشرة، شغّل خادماً محلياً (راجع README.md).'
  },
  en: {
    siteTitle: 'Lebanon Daily',
    dollarTitle: 'Dollar market rate',
    lbp: 'LBP',
    perDollar: 'for 1 US dollar',
    chartTitle: 'Last 7 days',
    lastUpdated: 'Last updated:',
    fuelTitle: "Today's fuel prices",
    gasoline95: 'Gasoline 95',
    gasoline98: 'Gasoline 98',
    diesel: 'Diesel',
    gasCylinder: 'Gas cylinder',
    fuelNote: 'Prices in Lebanese pounds (LBP)',
    disclaimer: 'Prices are for information only and may vary by location. Headlines come from the news sites shown; tap a headline to read the full story.',
    newsTitle: "Today's news",
    newsEmpty: 'No news right now.',
    switchTo: 'العربية',
    pageTitle: 'Lebanon Daily',
    error: 'Could not load prices. If you opened the file directly, run a local server (see README.md).'
  }
};

// The language currently shown, and the data once it is loaded.
let currentLang = DEFAULT_LANG;
let siteData = null;
let newsData = null;


/* ---------- 3. Loading the data ---------- */

// This is the ONLY function that knows where data comes from.
// To use a real source later, change DATA_URL above, or rewrite
// this function, as long as it still returns the same structure as data.json.
async function loadData() {
  // "no-store" makes the browser fetch fresh data instead of an old copy.
  const response = await fetch(DATA_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('HTTP ' + response.status);
  }
  return response.json();
}

// Same idea for the news file.
async function loadNews() {
  const response = await fetch(NEWS_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('HTTP ' + response.status);
  }
  return response.json();
}


/* ---------- 4. Filling the cards ---------- */

// 89500 -> "89,500". Western digits are used in both languages
// so prices look the same everywhere.
function formatNumber(n) {
  return Number(n).toLocaleString('en-US');
}

// "2026-11-03T09:30:00" -> "3 Nov 2026, 09:30" (or the Arabic version).
function formatDateTime(text) {
  const date = new Date(text);
  const locale = currentLang === 'ar' ? 'ar-LB-u-nu-latn' : 'en-GB';
  return date.toLocaleString(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// Short day name for the chart, e.g. "Mon" or "الإثنين".
function formatDay(text) {
  const locale = currentLang === 'ar' ? 'ar-LB-u-nu-latn' : 'en-GB';
  return new Date(text + 'T12:00:00').toLocaleDateString(locale, { weekday: 'short' });
}

// Put a value into the element with the given id.
function setText(id, value) {
  document.getElementById(id).textContent = value;
}

// Write all numbers and dates from the data into the page.
function renderData() {
  if (!siteData) return;

  // Dollar card
  setText('dollar-rate', formatNumber(siteData.dollar.rate));
  setText('dollar-updated', formatDateTime(siteData.dollar.lastUpdated));
  drawChart(siteData.dollar.history);

  // Fuel card
  const fuel = siteData.fuel;
  const lbp = ' ' + TEXT[currentLang].lbp;
  setText('gasoline95', formatNumber(fuel.gasoline95) + lbp);
  setText('gasoline98', formatNumber(fuel.gasoline98) + lbp);
  setText('diesel', formatNumber(fuel.diesel) + lbp);
  setText('gasCylinder', formatNumber(fuel.gasCylinder) + lbp);
  setText('fuel-updated', formatDateTime(fuel.lastUpdated));
}


/* ---------- 5. Drawing the 7-day chart ---------- */

// Draws a simple line chart as SVG (no library needed).
// "history" is the list of { date, rate } from data.json.
function drawChart(history) {
  const box = document.getElementById('dollar-chart');
  if (!history || history.length < 2) {
    box.innerHTML = '';
    return;
  }

  // Size of the drawing area (it scales to fit the card)
  const width = 340, height = 170;
  const padTop = 28, padBottom = 30, padSide = 22;

  const rates = history.map(function (d) { return d.rate; });
  const min = Math.min.apply(null, rates);
  const max = Math.max.apply(null, rates);
  const range = max - min || 1; // avoid dividing by zero if all equal

  // Turn each day into an x/y position on the drawing
  const points = history.map(function (d, i) {
    return {
      x: padSide + i * (width - padSide * 2) / (history.length - 1),
      y: padTop + (max - d.rate) / range * (height - padTop - padBottom),
      rate: d.rate,
      date: d.date
    };
  });

  const linePath = points.map(function (p, i) {
    return (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
  }).join(' ');
  const bottom = height - padBottom;
  const areaPath = linePath +
    ' L' + points[points.length - 1].x.toFixed(1) + ' ' + bottom +
    ' L' + points[0].x.toFixed(1) + ' ' + bottom + ' Z';

  // Build the SVG as text. Time always runs left to right.
  let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" direction="ltr">';
  svg += '<path class="area" d="' + areaPath + '"/>';
  svg += '<path class="line" d="' + linePath + '"/>';

  points.forEach(function (p, i) {
    svg += '<circle class="dot" cx="' + p.x + '" cy="' + p.y + '" r="4">' +
           '<title>' + p.date + ': ' + formatNumber(p.rate) + '</title></circle>';
    svg += '<text class="label" x="' + p.x + '" y="' + (height - 8) +
           '" text-anchor="middle">' + formatDay(p.date) + '</text>';
  });

  // Write the value above the highest, lowest and latest points
  const last = points[points.length - 1];
  const marked = [];
  [last,
   points.find(function (p) { return p.rate === max; }),
   points.find(function (p) { return p.rate === min; })
  ].forEach(function (p) {
    if (marked.indexOf(p) !== -1) return; // don't write the same label twice
    marked.push(p);
    const anchor = p === last ? 'end' : 'middle';
    svg += '<text class="value" x="' + p.x + '" y="' + (p.y - 10) +
           '" text-anchor="' + anchor + '">' + formatNumber(p.rate) + '</text>';
  });

  svg += '</svg>';
  box.innerHTML = svg;
}


/* ---------- 6. The news list ---------- */

// Build one <li> per headline in the current language.
// Each item in news.json looks like:
//   { "lang": "ar", "title": "...", "summary": "...", "source": "LBCI",
//     "url": "https://...", "publishedAt": "2026-11-14T09:50:00.000Z" }
// We use createElement + textContent (never innerHTML) so that text
// coming from news websites can't inject code into the page.
function renderNews() {
  if (!newsData) return;
  const list = document.getElementById('news-list');
  list.innerHTML = '';

  const items = (newsData.items || []).filter(function (item) {
    return item.lang === currentLang;
  });
  if (items.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = TEXT[currentLang].newsEmpty;
    list.appendChild(empty);
  }

  items.forEach(function (item) {
    const li = document.createElement('li');

    // Headline, linking to the original article in a new tab
    const title = document.createElement('h3');
    const link = document.createElement('a');
    link.textContent = item.title;
    if (String(item.url).startsWith('https://')) {
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    title.appendChild(link);
    li.appendChild(title);

    // Short summary, if the website gave one
    if (item.summary) {
      const summary = document.createElement('p');
      summary.textContent = item.summary;
      li.appendChild(summary);
    }

    // "LBCI · 14 Nov 2026, 11:50"
    // Each part sits in its own <bdi> so English and Arabic don't get mixed up.
    const meta = document.createElement('span');
    meta.className = 'news-meta';
    const source = document.createElement('bdi');
    source.textContent = item.source;
    const date = document.createElement('bdi');
    date.textContent = formatDateTime(item.publishedAt);
    meta.append(source, ' · ', date);
    li.appendChild(meta);

    list.appendChild(li);
  });

  setText('news-updated', formatDateTime(newsData.lastUpdated));
}


/* ---------- 7. The language button ---------- */

// Switch every text on the page to the chosen language.
function applyLanguage(lang) {
  currentLang = lang;
  const words = TEXT[lang];

  // Arabic reads right-to-left, English left-to-right
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.title = words.pageTitle;

  // Replace the text of every element that has data-i18n="..."
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    const key = el.getAttribute('data-i18n');
    if (words[key]) el.textContent = words[key];
  });

  document.getElementById('lang-toggle').textContent = words.switchTo;

  // Remember the choice for next visit (ignore errors in private mode)
  try { localStorage.setItem('lang', lang); } catch (e) {}

  // Redraw numbers, dates and news in the new language
  renderData();
  renderNews();
  const errorBox = document.getElementById('error-box');
  if (!errorBox.hidden) errorBox.textContent = words.error;
}

document.getElementById('lang-toggle').addEventListener('click', function () {
  applyLanguage(currentLang === 'ar' ? 'en' : 'ar');
});


/* ---------- 8. Start ---------- */

async function start() {
  // Use the language from the last visit, otherwise Arabic
  let saved = null;
  try { saved = localStorage.getItem('lang'); } catch (e) {}
  applyLanguage(saved === 'en' ? 'en' : DEFAULT_LANG);

  try {
    siteData = await loadData();
    renderData();
  } catch (err) {
    console.error('Could not load data:', err);
    const errorBox = document.getElementById('error-box');
    errorBox.textContent = TEXT[currentLang].error;
    errorBox.hidden = false;
  }

  // News is loaded separately, so a problem with it never hides the prices
  try {
    newsData = await loadNews();
    renderNews();
  } catch (err) {
    console.error('Could not load news:', err);
  }
}

start();
