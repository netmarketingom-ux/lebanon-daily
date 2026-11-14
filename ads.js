/* =========================================================
   Lebanon Daily - Google AdSense settings
   This is the ONLY file you need to edit to turn ads on.
   (Also see "Google ads" in README.md for the full steps.)

   1. Paste your publisher ID below (from AdSense: Account -> Settings ->
      Account information). It looks like "ca-pub-1234567890123456".
   2. In AdSense create one "Display ad" unit per ad space
      (Ads -> By ad unit -> Display ads, choose "Responsive"),
      and paste each unit's slot ID (a number like "1234567890") below.
      An ad space with an empty slot ID stays hidden.

   While "client" is empty, no Google code is loaded and all ad spaces
   are hidden, so the site looks normal.

   To see where the ads will appear before you have AdSense, open the site
   with ?ads=preview at the end of the address, e.g.
   http://localhost:8000/?ads=preview
   ========================================================= */

const ADSENSE = {
  client: '',          // e.g. 'ca-pub-1234567890123456'
  slots: {
    top: '',           // under the header
    middle: '',        // between the price cards and the exchange rates
    bottom: ''         // after the news
  }
};


/* ---------- You don't need to change anything below ---------- */

(function () {
  const adSpaces = document.querySelectorAll('.ad-slot');
  const preview = new URLSearchParams(location.search).get('ads') === 'preview';

  // Preview mode: show dashed boxes where the ads will go
  if (preview) {
    adSpaces.forEach(function (space) {
      space.hidden = false;
      space.classList.add('ad-preview');
      const box = document.createElement('div');
      box.className = 'ad-preview-box';
      box.textContent = 'Ad space: ' + space.dataset.slot + ' (responsive)';
      space.appendChild(box);
    });
    return;
  }

  // No publisher ID yet: keep all ad spaces hidden, load nothing
  if (!ADSENSE.client) return;

  // Load Google's ad code once
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
    encodeURIComponent(ADSENSE.client);
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);

  // Fill each ad space that has a slot ID
  adSpaces.forEach(function (space) {
    const slotId = ADSENSE.slots[space.dataset.slot];
    if (!slotId) return; // no slot ID: stays hidden

    const ad = document.createElement('ins');
    ad.className = 'adsbygoogle';
    ad.style.display = 'block';
    ad.setAttribute('data-ad-client', ADSENSE.client);
    ad.setAttribute('data-ad-slot', slotId);
    ad.setAttribute('data-ad-format', 'auto');
    ad.setAttribute('data-full-width-responsive', 'true');
    space.appendChild(ad);
    space.hidden = false;
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  });
})();
