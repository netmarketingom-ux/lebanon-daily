/* =========================================================
   Lebanon Daily - app.js
   What this file does, in order:
     1. Settings (where the data comes from)
     2. All the words on the page, in Arabic and English
     3. Loading the data files
     4. Small helpers (number and date formats)
     5. Gold & silver card
     6. Exchange rates card
     7. Fuel card
     8. Drawing the 7-day chart
     9. The news list
    10. The language button
    11. Starting everything
   ========================================================= */


/* ---------- 1. Settings ---------- */

// The three data files. Each one is loaded separately, so a problem
// with one never hides the others.
//   data.json    - fuel prices and the LBP rate. You edit this by hand.
//   markets.json - gold, silver and exchange rates. Updated automatically
//                  by agent/update-markets.mjs (you don't need to edit it).
//   news.json    - news headlines. Updated automatically by agent/update-news.mjs.
const DATA_URL = 'data.json';
const MARKETS_URL = 'markets.json';
const NEWS_URL = 'news.json';

// Arabic is the default language.
const DEFAULT_LANG = 'ar';

// Grams in one troy ounce (the unit gold and silver are priced in)
const GRAMS_PER_OUNCE = 31.1034768;


/* ---------- 2. Words in both languages ---------- */

// Each key matches a data-i18n="..." attribute in index.html.
// To change any wording on the site, edit it here.
const TEXT = {
  ar: {
    siteTitle: 'لبنان اليوم',
    goldTitle: 'الذهب والفضة',
    goldOunceNote: 'سعر أونصة الذهب (31.1 غرام) بالدولار الأميركي',
    gold24: 'غرام ذهب عيار 24',
    gold21: 'غرام ذهب عيار 21',
    gold18: 'غرام ذهب عيار 18',
    silverOunce: 'أونصة فضة',
    goldChartTitle: 'سعر أونصة الذهب، آخر 7 أيام',
    chartSoon: 'يظهر الرسم البياني بعد يومين من جمع الأسعار.',
    goldNote: 'أسعار عالمية. سعر المحلات في لبنان يشمل المصنعية وقد يختلف.',
    forexTitle: 'أسعار العملات',
    forexPer: '1 دولار أميركي يساوي:',
    mainCurrencies: 'العملات الرئيسية',
    arabCurrencies: 'العملات العربية',
    forexNote: 'أسعار مرجعية تُحدَّث يومياً، ليوم',
    forexMarketNote: 'في بعض الدول (مثل سوريا والسودان ومصر وليبيا) قد يختلف سعر السوق عن السعر الرسمي.',
    ratesBy: 'الأسعار من',
    fixed: 'سعر ثابت',
    currencies: {
      EUR: 'يورو', GBP: 'جنيه إسترليني', CHF: 'فرنك سويسري',
      TRY: 'ليرة تركية', CAD: 'دولار كندي', AUD: 'دولار أسترالي', LBP: 'ليرة لبنانية',
      SAR: 'ريال سعودي', AED: 'درهم إماراتي', KWD: 'دينار كويتي', QAR: 'ريال قطري',
      BHD: 'دينار بحريني', OMR: 'ريال عُماني', JOD: 'دينار أردني', IQD: 'دينار عراقي',
      SYP: 'ليرة سورية', EGP: 'جنيه مصري', YER: 'ريال يمني', SDG: 'جنيه سوداني',
      LYD: 'دينار ليبي', TND: 'دينار تونسي', DZD: 'دينار جزائري', MAD: 'درهم مغربي',
      MRU: 'أوقية موريتانية', SOS: 'شلن صومالي', DJF: 'فرنك جيبوتي', KMF: 'فرنك قمري'
    },
    lastUpdated: 'آخر تحديث:',
    fuelTitle: 'أسعار المحروقات اليوم',
    gasoline95: 'بنزين 95 أوكتان',
    gasoline98: 'بنزين 98 أوكتان',
    diesel: 'مازوت',
    gasCylinder: 'قارورة غاز',
    lbp: 'ل.ل.',
    fuelNote: 'الأسعار بالليرة اللبنانية',
    newsTitle: 'أخبار اليوم',
    newsEmpty: 'لا توجد أخبار حالياً.',
    disclaimer: 'الأسعار للاطلاع فقط وليست نصيحة استثمارية، وقد تختلف من مكان لآخر. العناوين من مواقع الأخبار المذكورة، اضغط على العنوان لقراءة الخبر كاملاً.',
    adLabel: 'إعلان',
    privacyLink: 'سياسة الخصوصية',
    switchTo: 'English',
    pageTitle: 'لبنان اليوم',
    error: 'تعذّر تحميل الأسعار. إذا فتحت الملف مباشرة، شغّل خادماً محلياً (راجع README.md).'
  },
  en: {
    siteTitle: 'Lebanon Daily',
    goldTitle: 'Gold & silver',
    goldOunceNote: 'Gold, per ounce (31.1 g), in US dollars',
    gold24: 'Gold 24k, per gram',
    gold21: 'Gold 21k, per gram',
    gold18: 'Gold 18k, per gram',
    silverOunce: 'Silver, per ounce',
    goldChartTitle: 'Gold per ounce, last 7 days',
    chartSoon: 'The chart appears after two days of collected prices.',
    goldNote: 'International prices. Shop prices in Lebanon include workmanship and may differ.',
    forexTitle: 'Exchange rates',
    forexPer: '1 US dollar equals:',
    mainCurrencies: 'Main currencies',
    arabCurrencies: 'Arab currencies',
    forexNote: 'Reference rates, updated daily, for',
    forexMarketNote: 'In some countries (such as Syria, Sudan, Egypt and Libya) the market rate can differ from the official rate.',
    ratesBy: 'Rates by',
    fixed: 'fixed rate',
    currencies: {
      EUR: 'Euro', GBP: 'British pound', CHF: 'Swiss franc',
      TRY: 'Turkish lira', CAD: 'Canadian dollar', AUD: 'Australian dollar', LBP: 'Lebanese pound',
      SAR: 'Saudi riyal', AED: 'UAE dirham', KWD: 'Kuwaiti dinar', QAR: 'Qatari riyal',
      BHD: 'Bahraini dinar', OMR: 'Omani rial', JOD: 'Jordanian dinar', IQD: 'Iraqi dinar',
      SYP: 'Syrian pound', EGP: 'Egyptian pound', YER: 'Yemeni rial', SDG: 'Sudanese pound',
      LYD: 'Libyan dinar', TND: 'Tunisian dinar', DZD: 'Algerian dinar', MAD: 'Moroccan dirham',
      MRU: 'Mauritanian ouguiya', SOS: 'Somali shilling', DJF: 'Djiboutian franc', KMF: 'Comorian franc'
    },
    lastUpdated: 'Last updated:',
    fuelTitle: "Today's fuel prices",
    gasoline95: 'Gasoline 95',
    gasoline98: 'Gasoline 98',
    diesel: 'Diesel',
    gasCylinder: 'Gas cylinder',
    lbp: 'LBP',
    fuelNote: 'Prices in Lebanese pounds (LBP)',
    newsTitle: "Today's news",
    newsEmpty: 'No news right now.',
    disclaimer: 'Prices are for information only, not investment advice, and may vary by location. Headlines come from the news sites shown; tap a headline to read the full story.',
    adLabel: 'Advertisement',
    privacyLink: 'Privacy policy',
    switchTo: 'العربية',
    pageTitle: 'Lebanon Daily',
    error: 'Could not load prices. If you opened the file directly, run a local server (see README.md).'
  }
};

// The language currently shown, and the data once it is loaded.
let currentLang = DEFAULT_LANG;
let siteData = null;
let marketsData = null;
let newsData = null;


/* ---------- 3. Loading the data files ---------- */

// Download one JSON file. "no-store" makes the browser fetch a fresh copy.
// To connect a different data source later, this is the function to change.
async function loadJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('HTTP ' + response.status);
  }
  return response.json();
}


/* ---------- 4. Small helpers ---------- */

// 89500 -> "89,500"; formatNumber(3887.6, 2) -> "3,887.60".
// Western digits are used in both languages so prices look the same everywhere.
function formatNumber(n, decimals) {
  decimals = decimals || 0;
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// "2026-11-03T09:30:00" -> "3 Nov 2026, 09:30" (or the Arabic version).
function formatDateTime(text) {
  const locale = currentLang === 'ar' ? 'ar-LB-u-nu-latn' : 'en-GB';
  return new Date(text).toLocaleString(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// "2026-11-13" -> "13 Nov 2026"
function formatDate(text) {
  const locale = currentLang === 'ar' ? 'ar-LB-u-nu-latn' : 'en-GB';
  return new Date(text + 'T12:00:00').toLocaleDateString(locale, {
    day: 'numeric', month: 'short', year: 'numeric'
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

// Show the change from an old to a new value, e.g. "▲ 0.45%".
// colored = true: green when up, red when down (for gold and silver).
// colored = false: grey either way (for exchange rates, where "up" is neither good nor bad).
function showChange(element, oldValue, newValue, colored) {
  element.className = 'change';
  if (!oldValue || !newValue) {
    element.textContent = '';
    return;
  }
  const percent = (newValue - oldValue) / oldValue * 100;
  const arrow = percent > 0.005 ? '▲' : (percent < -0.005 ? '▼' : '•');
  element.textContent = arrow + ' ' + Math.abs(percent).toFixed(2) + '%';
  if (colored && arrow === '▲') element.classList.add('up');
  if (colored && arrow === '▼') element.classList.add('down');
}


/* ---------- 5. Gold & silver card ---------- */

function renderMetals() {
  if (!marketsData || !marketsData.metals) return;
  const metals = marketsData.metals;

  // Yesterday's price (the entry before today's in the history), for the change
  const history = metals.history || [];
  const yesterday = history.length >= 2 ? history[history.length - 2] : null;

  setText('gold-ounce', '$' + formatNumber(metals.gold, 2));
  showChange(document.getElementById('gold-change'), yesterday && yesterday.gold, metals.gold, true);

  // Price per gram: pure gold is 24 karat, so 21k is 21/24 of it, and so on.
  const gram24 = metals.gold / GRAMS_PER_OUNCE;
  setText('gold24', '$' + formatNumber(gram24, 2));
  setText('gold21', '$' + formatNumber(gram24 * 21 / 24, 2));
  setText('gold18', '$' + formatNumber(gram24 * 18 / 24, 2));

  setText('silver-ounce', '$' + formatNumber(metals.silver, 2));
  showChange(document.getElementById('silver-change'), yesterday && yesterday.silver, metals.silver, true);

  const chartPoints = history.map(function (day) { return { date: day.date, value: day.gold }; });
  drawChart('gold-chart', chartPoints, function (v) { return '$' + formatNumber(v); });
  document.getElementById('gold-chart-soon').hidden = chartPoints.length >= 2;

  setText('metals-updated', formatDateTime(metals.updatedAt));
}


/* ---------- 6. Exchange rates card ---------- */

// Builds the two lists (main and Arab currencies). Each row shows the
// currency name, how much of it 1 US dollar buys, and the change since the day before.
function renderForex() {
  if (!marketsData || !marketsData.forex) return;
  const forex = marketsData.forex;
  const words = TEXT[currentLang];

  fillRateList('forex-main', forex.main || [], forex);

  // Arab currencies, plus the Lebanese pound from data.json (fixed, so no change shown)
  const arabList = fillRateList('forex-arab', forex.arab || [], forex);
  if (siteData && siteData.lbpRate) {
    const fixed = document.createElement('span');
    fixed.className = 'change';
    fixed.textContent = words.fixed;
    arabList.prepend(makeRateRow(words.currencies.LBP, formatNumber(siteData.lbpRate) + ' LBP', fixed));
  }

  setText('forex-date', formatDate(forex.date));
  setText('forex-updated', formatDateTime(forex.updatedAt));
}

// Fill one <ul> with a row per currency code, and return it
function fillRateList(listId, codes, forex) {
  const list = document.getElementById(listId);
  list.innerHTML = '';
  codes.forEach(function (code) {
    const value = forex.rates[code];
    const change = document.createElement('span');
    showChange(change, forex.previous && forex.previous[code], value, false);
    const name = TEXT[currentLang].currencies[code] || code;
    list.appendChild(makeRateRow(name, formatRate(value) + ' ' + code, change));
  });
  return list;
}

// Small numbers get more decimals: 0.3113 KWD, 3.7500 SAR, 53.44 EGP, 1,514 IQD
function formatRate(value) {
  if (value < 10) return formatNumber(value, 4);
  if (value < 1000) return formatNumber(value, 2);
  return formatNumber(value);
}

// One <li> of an exchange rates list
function makeRateRow(name, valueText, changeElement) {
  const li = document.createElement('li');
  const label = document.createElement('span');
  label.textContent = name;
  const right = document.createElement('span');
  right.className = 'rate-value';
  const strong = document.createElement('strong');
  strong.textContent = valueText;
  right.append(strong, changeElement);
  li.append(label, right);
  return li;
}


/* ---------- 7. Fuel card ---------- */

function renderFuel() {
  if (!siteData) return;
  const fuel = siteData.fuel;
  const lbp = ' ' + TEXT[currentLang].lbp;
  setText('gasoline95', formatNumber(fuel.gasoline95) + lbp);
  setText('gasoline98', formatNumber(fuel.gasoline98) + lbp);
  setText('diesel', formatNumber(fuel.diesel) + lbp);
  setText('gasCylinder', formatNumber(fuel.gasCylinder) + lbp);
  setText('fuel-updated', formatDateTime(fuel.lastUpdated));
}


/* ---------- 8. Drawing the 7-day chart ---------- */

// Draws a simple line chart as SVG (no library needed).
//   boxId:  the id of the <div> to draw in
//   points: a list of { date: "2026-11-14", value: 3887.6 }
//   format: a function that turns a value into the label text
function drawChart(boxId, points, format) {
  const box = document.getElementById(boxId);
  if (!points || points.length < 2) {
    box.innerHTML = '';
    return;
  }

  // Size of the drawing area (it scales to fit the card)
  const width = 340, height = 180;
  const padTop = 28, padBottom = 46, padSide = 26; // room for labels above and below

  const values = points.map(function (p) { return p.value; });
  const min = Math.min.apply(null, values);
  const max = Math.max.apply(null, values);
  const range = max - min || 1; // avoid dividing by zero if all equal

  // Turn each day into an x/y position on the drawing
  const dots = points.map(function (p, i) {
    return {
      x: padSide + i * (width - padSide * 2) / (points.length - 1),
      y: padTop + (max - p.value) / range * (height - padTop - padBottom),
      value: p.value,
      date: p.date
    };
  });

  const linePath = dots.map(function (d, i) {
    return (i === 0 ? 'M' : 'L') + d.x.toFixed(1) + ' ' + d.y.toFixed(1);
  }).join(' ');
  const bottom = height - padBottom;
  const areaPath = linePath +
    ' L' + dots[dots.length - 1].x.toFixed(1) + ' ' + bottom +
    ' L' + dots[0].x.toFixed(1) + ' ' + bottom + ' Z';

  // Build the SVG as text. Time always runs left to right.
  let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" direction="ltr">';
  svg += '<path class="area" d="' + areaPath + '"/>';
  svg += '<path class="line" d="' + linePath + '"/>';

  dots.forEach(function (d) {
    svg += '<circle class="dot" cx="' + d.x + '" cy="' + d.y + '" r="4">' +
           '<title>' + d.date + ': ' + format(d.value) + '</title></circle>';
    svg += '<text class="label" x="' + d.x + '" y="' + (height - 8) +
           '" text-anchor="middle">' + formatDay(d.date) + '</text>';
  });

  // Write the value next to the highest, latest and lowest points.
  // The lowest one goes below its dot so it doesn't sit on the line.
  const last = dots[dots.length - 1];
  const highest = dots.find(function (d) { return d.value === max; });
  const lowest = dots.find(function (d) { return d.value === min; });
  const marked = [];
  [last, highest, lowest].forEach(function (d) {
    if (marked.indexOf(d) !== -1) return; // don't write the same label twice
    marked.push(d);
    const anchor = d === last ? 'end' : (d === dots[0] ? 'start' : 'middle');
    const y = (d === lowest && d !== last) ? d.y + 20 : d.y - 10;
    svg += '<text class="value" x="' + d.x + '" y="' + y +
           '" text-anchor="' + anchor + '">' + format(d.value) + '</text>';
  });

  svg += '</svg>';
  box.innerHTML = svg;
}


/* ---------- 9. The news list ---------- */

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


/* ---------- 10. The language button ---------- */

// Fill every card again (after loading, or after switching language)
function renderAll() {
  renderMetals();
  renderForex();
  renderFuel();
  renderNews();
}

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
    if (typeof words[key] === 'string') el.textContent = words[key];
  });

  document.getElementById('lang-toggle').textContent = words.switchTo;

  // Remember the choice for next visit (ignore errors in private mode)
  try { localStorage.setItem('lang', lang); } catch (e) {}

  renderAll();
  const errorBox = document.getElementById('error-box');
  if (!errorBox.hidden) errorBox.textContent = words.error;
}

document.getElementById('lang-toggle').addEventListener('click', function () {
  applyLanguage(currentLang === 'ar' ? 'en' : 'ar');
});


/* ---------- 11. Start ---------- */

function showError(err) {
  console.error('Could not load data:', err);
  const errorBox = document.getElementById('error-box');
  errorBox.textContent = TEXT[currentLang].error;
  errorBox.hidden = false;
}

async function start() {
  // Use the language from the last visit, otherwise Arabic
  let saved = null;
  try { saved = localStorage.getItem('lang'); } catch (e) {}
  applyLanguage(saved === 'en' ? 'en' : DEFAULT_LANG);

  // Load the three files at the same time; each card fills in when its file arrives
  const loads = [
    loadJson(DATA_URL).then(function (d) { siteData = d; renderFuel(); renderForex(); }).catch(showError),
    loadJson(MARKETS_URL).then(function (d) { marketsData = d; renderMetals(); renderForex(); }).catch(showError),
    loadJson(NEWS_URL).then(function (d) { newsData = d; renderNews(); })
      .catch(function (err) { console.error('Could not load news:', err); })
  ];
  await Promise.all(loads);
}

start();
