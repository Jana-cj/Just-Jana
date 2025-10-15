/* Just Jana — Top Loading Bar (multicolor) */
(function () {
  'use strict';

  var COLORS = ['#f6ddbd', '#f6cecc', '#f5bfdd'];
  var HEIGHT_PX = 3, START_ON_NEW_PAGE = 25, RAMP_TARGET = 90, TICK_MS = 160, EASE = 0.12;
  var STORAGE_KEY = 'jjProgressPending';

  function safeSet(k, v){ try{ sessionStorage.setItem(k, v);}catch(e){} }
  function safeDel(k){ try{ sessionStorage.removeItem(k);}catch(e){} }
  function safeGet(k){ try{ return sessionStorage.getItem(k);}catch(e){ return null;} }

  var bar, prog = 0, timer = null, styleTag, sheenInserted = false;

  function ensureStyle(){
    if (styleTag) return;
    styleTag = document.createElement('style');
    styleTag.textContent =
      '#jj-topbar{position:fixed;top:0;left:0;height:'+HEIGHT_PX+'px;width:0;z-index:99999;' +
      'background:linear-gradient(90deg,'+COLORS.join(',')+');background-size:300% 100%;' +
      'box-shadow:0 0 10px rgba(0,0,0,.08);transition:width .25s ease,opacity .25s ease;' +
      'animation:jj-sheen 1.4s linear infinite;opacity:1}' +
      '@keyframes jj-sheen{0%{background-position:0 0}100%{background-position:300% 0}}';
    document.head.appendChild(styleTag);
    sheenInserted = true;
  }

  function ensureBar(){
    ensureStyle();
    bar = document.getElementById('jj-topbar');
    if (!bar){
      bar = document.createElement('div');
      bar.id = 'jj-topbar';
      // inline fallback
      bar.style.position='fixed'; bar.style.top='0'; bar.style.left='0';
      bar.style.height=HEIGHT_PX+'px'; bar.style.width='0';
      bar.style.zIndex='99999';
      bar.style.background='linear-gradient(90deg,'+COLORS.join(',')+')';
      bar.style.backgroundSize='300% 100%';
      bar.style.boxShadow='0 0 10px rgba(0,0,0,.08)';
      bar.style.transition='width .25s ease,opacity .25s ease';
      if (!sheenInserted){
        var s=document.createElement('style');
        s.textContent='@keyframes jj-sheen{0%{background-position:0 0}100%{background-position:300% 0}}';
        document.head.appendChild(s);
      }
      bar.style.animation='jj-sheen 1.4s linear infinite';
      document.documentElement.appendChild(bar);
    }
    return bar;
  }

  function tick(to){
    clearInterval(timer);
    timer = setInterval(function(){
      prog += Math.max(1, (to - prog) * EASE);
      if (prog >= to){ prog = to; clearInterval(timer); }
      if (bar) bar.style.width = prog + '%';
    }, TICK_MS);
  }

  function start(){
    ensureBar();
    prog = 0;
    bar.style.opacity = '1';
    bar.style.width = '0%';
    tick(RAMP_TARGET);
    safeSet(STORAGE_KEY, '1'); // tell the *next* page to show early
  }

  function done(){
    clearInterval(timer);
    ensureBar();
    prog = 100;
    bar.style.width = '100%';
    safeDel(STORAGE_KEY);
    setTimeout(function(){
      bar.style.opacity = '0';
      setTimeout(function(){ bar.style.width = '0%'; }, 250);
    }, 200);
  }

  // --- FIX 1: show initial head-start on fresh navigation only, not on bfcache restores
  var navType = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]?.type) || 'navigate';
  if (safeGet(STORAGE_KEY) === '1' && navType !== 'back_forward'){
    ensureBar();
    requestAnimationFrame(function(){ bar.style.width = START_ON_NEW_PAGE + '%'; });
  } else {
    // If we’re back/forward restored, clear any stale flag and hide the bar
    safeDel(STORAGE_KEY);
  }

  // --- FIX 2: finish when page is loaded or restored from bfcache
  window.addEventListener('load', done);

  // pageshow fires on normal load AND on bfcache restore; persisted==true means from cache
  window.addEventListener('pageshow', function(e){
    // If we came from bfcache or back/forward nav, ensure the bar completes
    if (e.persisted || navType === 'back_forward') {
      done();
    }
  });

  // --- FIX 3: if the document is already complete (e.g., super-fast cache load), finish
  if (document.readyState === 'complete') {
    // queue to let styles attach
    setTimeout(done, 0);
  }

  // --- Safety timeout: never hang forever (e.g., blocked load events)
  setTimeout(function(){
    if (bar && bar.style.opacity !== '0') done();
  }, 8000);

  // Start on user-initiated navigations
  document.addEventListener('click', function(e){
    var t = e.target && (e.target.nodeType === 1 ? e.target : e.target.parentElement);
    if (!t) return;
    var a = t.closest && t.closest('a[href]');
    if (!a) return;

    var href = a.getAttribute('href') || '';
    var targetAttr = a.getAttribute('target');
    var rel = (a.getAttribute('rel')||'').toLowerCase();

    // ignore: in-page, special schemes, downloads, new tabs
    if (href.charAt(0)==='#' || href.startsWith('javascript:') || href.startsWith('mailto:') ||
        href.startsWith('tel:') || a.hasAttribute('download') || targetAttr === '_blank' || rel.includes('external')){
      return;
    }
    // ignore exact same URL (prevents false start on no-op links)
    try {
      var url = new URL(href, location.href);
      if (url.href === location.href) return;
    } catch (_) {}

    start();
  }, { capture: true });

  // Mark outgoing navs (programmatic or browser controls)
  window.addEventListener('beforeunload', function(){
    safeSet(STORAGE_KEY, '1');
  });
})();
