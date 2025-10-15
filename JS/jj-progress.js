/* Just Jana — Top Loading Bar (multicolor)
   Colors: #f6ddbd, #f6cecc, #f5bfdd
   Works across page navigations via sessionStorage.
   Include with: <script src="/js/jj-progress.js" defer></script>
*/
(function () {
  'use strict';

  // --- Config ---
  var COLORS = ['#f6ddbd', '#f6cecc', '#f5bfdd'];
  var HEIGHT_PX = 3;            // bar thickness
  var START_ON_NEW_PAGE = 25;   // initial % width shown as soon as next page starts rendering
  var RAMP_TARGET = 90;         // % to creep toward during load
  var TICK_MS = 160;            // animation tick
  var EASE = 0.12;              // ease factor toward target
  var STORAGE_KEY = 'jjProgressPending';

  // --- Utilities ---
  function safeSet(key, val) { try { sessionStorage.setItem(key, val); } catch (e) {} }
  function safeDel(key) { try { sessionStorage.removeItem(key); } catch (e) {} }
  function safeGet(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } }

  // Create (or get) the bar + style once DOM is ready enough to attach to <html>
  var bar, prog = 0, timer = null, styleTag, sheenInserted = false;

  function ensureStyle() {
    if (styleTag) return;
    styleTag = document.createElement('style');
    styleTag.setAttribute('data-jj-progress', 'true');
    // Build gradient
    var grad = 'linear-gradient(90deg,' + COLORS.join(',') + ')';
    // CSS (no external file needed)
    styleTag.textContent =
      ':root{--jj-bar-1:' + COLORS[0] + ';--jj-bar-2:' + COLORS[1] + ';--jj-bar-3:' + COLORS[2] + ';}' +
      '#jj-topbar{position:fixed;top:0;left:0;height:' + HEIGHT_PX + 'px;width:0;z-index:99999;' +
      'background:' + grad + ';background-size:300% 100%;' +
      'box-shadow:0 0 10px rgba(0,0,0,.08);transition:width .25s ease,opacity .25s ease;' +
      'animation:jj-sheen 1.4s linear infinite;opacity:1}' +
      '@keyframes jj-sheen{0%{background-position:0 0}100%{background-position:300% 0}}';
    document.head.appendChild(styleTag);
    sheenInserted = true;
  }

  function ensureBar() {
    ensureStyle();
    bar = document.getElementById('jj-topbar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'jj-topbar';
      // Low-level inline fallback in case CSS didn’t parse yet
      bar.style.position = 'fixed';
      bar.style.top = '0';
      bar.style.left = '0';
      bar.style.height = HEIGHT_PX + 'px';
      bar.style.width = '0';
      bar.style.zIndex = '99999';
      bar.style.background = 'linear-gradient(90deg,' + COLORS.join(',') + ')';
      bar.style.backgroundSize = '300% 100%';
      bar.style.boxShadow = '0 0 10px rgba(0,0,0,.08)';
      bar.style.transition = 'width .25s ease,opacity .25s ease';
      if (!sheenInserted) {
        // inject keyframes if style blocked by CSP—optional
        try {
          var s = document.createElement('style');
          s.textContent = '@keyframes jj-sheen{0%{background-position:0 0}100%{background-position:300% 0}}';
          document.head.appendChild(s);
        } catch (e) {}
      }
      bar.style.animation = 'jj-sheen 1.4s linear infinite';
      // Append to <html> to avoid layout shifts with nested wrappers
      document.documentElement.appendChild(bar);
    }
    return bar;
  }

  function tick(to) {
    clearInterval(timer);
    timer = setInterval(function () {
      prog += Math.max(1, (to - prog) * EASE);
      if (prog >= to) { prog = to; clearInterval(timer); }
      if (bar) bar.style.width = prog + '%';
    }, TICK_MS);
  }

  function start() {
    ensureBar();
    prog = 0;
    bar.style.opacity = '1';
    bar.style.width = '0%';
    tick(RAMP_TARGET);
    safeSet(STORAGE_KEY, '1'); // flag for next page
  }

  function done() {
    clearInterval(timer);
    prog = 100;
    ensureBar();
    bar.style.width = '100%';
    safeDel(STORAGE_KEY);
    setTimeout(function () {
      bar.style.opacity = '0';
      setTimeout(function () { bar.style.width = '0%'; }, 250);
    }, 200);
  }

  // If previous page said "we’re navigating", show a head-start bar quickly.
  // Because this script is deferred, DOM is available here.
  if (safeGet(STORAGE_KEY) === '1') {
    ensureBar();
    requestAnimationFrame(function () {
      bar.style.width = START_ON_NEW_PAGE + '%';
    });
  }

  // Mark navigation on beforeunload as a safety net (works for programmatic navigations)
  window.addEventListener('beforeunload', function () {
    safeSet(STORAGE_KEY, '1');
  });

  // Complete when this page actually finishes loading
  window.addEventListener('load', function () {
    done();
  });

  // Intercept clicks on links to start early
  document.addEventListener('click', function (e) {
    // Some events may originate from text nodes etc.; climb to the nearest element first
    var target = e.target && e.target.nodeType === 1 ? e.target : (e.target && e.target.parentElement);
    if (!target) return;
    var a = target.closest && target.closest('a[href]');
    if (!a) return;

    var href = a.getAttribute('href') || '';
    var targetAttr = a.getAttribute('target');
    var rel = (a.getAttribute('rel') || '').toLowerCase();

    // Ignore in-page anchors, javascript:, mailto:, tel:, downloads, or forced new tabs
    if (href.charAt(0) === '#' ||
        href.startsWith('javascript:') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        a.hasAttribute('download') ||
        targetAttr === '_blank' ||
        rel.includes('external')) {
      return;
    }

    // If you want to limit to same-origin only, uncomment below:
    // try {
    //   var url = new URL(href, location.href);
    //   if (url.origin !== location.origin) return;
    // } catch (_) {}

    start();
  }, { capture: true });

})();
