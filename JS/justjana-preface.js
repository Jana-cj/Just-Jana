/* ============== Just Jana — Story Preface Gate (iOS-safe) ==============
How it works:
- Add class "requires-preface" to any link/element that should trigger the gate.
- Optional: data-preface-key="unique-key" to scope the "don't show again" per story.
  - If omitted, falls back to the element's href or current page path.

Public API:
  JJPreface.show({ targetHref: null, key: 'story-slug' })
  JJPreface.hide()

Notes:
- Uses a robust body-lock (fixed position) so iOS doesn’t steal scroll.
- Focus is trapped inside the dialog while open.
- Only .jjp-content scrolls; the overlay/dialog themselves do not.
*/

(function () {
  // ---------- DOM ----------
  const overlay     = document.getElementById('jj-preface-overlay');
  if (!overlay) return; // fail-safe
  const dialog      = overlay.querySelector('.jjp-dialog');
  const content     = overlay.querySelector('.jjp-content');
  const btnClose    = overlay.querySelector('.jjp-close');
  const btnContinue = document.getElementById('jjp-continue');
  const btnCancel   = document.getElementById('jjp-cancel');
  const dontShow    = document.getElementById('jjp-dontshow');

  // ---------- State ----------
  let pendingHref = null;
  let currentKey  = null;
  let lastFocused = null;
  let lockY       = 0;   // background scroll position

  // ---------- Utilities ----------
  const keyFor = (el) => {
    const explicit = el?.getAttribute?.('data-preface-key');
    if (explicit) return explicit;
    const href = el?.getAttribute?.('href');
    if (href && href !== '#') return `jjp:${href}`;
    return `jjp:${location.pathname}`;
  };

  const shouldSkip = (key) => sessionStorage.getItem(key) === '1';

  // iOS-safe page lock: freeze the page at current Y and prevent background scroll
  function lockPage() {
    lockY = window.scrollY || document.documentElement.scrollTop || 0;

    document.documentElement.classList.add('jjp-open');
    document.body.classList.add('jjp-open');

    // Fixed-position lock prevents iOS scroll bleed
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  }

  function unlockPage() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';

    document.documentElement.classList.remove('jjp-open');
    document.body.classList.remove('jjp-open');

    // Restore scroll position
    window.scrollTo(0, lockY || 0);
  }

  // Trap focus within the dialog while open
  function trapFocus(e) {
    if (overlay.getAttribute('aria-hidden') === 'true') return;

    const focusables = Array
      .from(overlay.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ))
      .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);

    if (!focusables.length) return;

    const first = focusables[0];
    const last  = focusables[focusables.length - 1];

    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    } else if (e.key === 'Escape') {
      hide();
    }
  }

  // Prevent scroll chaining / rubber-banding to the page behind
  function blockScrollLeak(e) {
    if (overlay.getAttribute('aria-hidden') === 'true') return;

    // Allow native scroll only inside the scrolling content area
    const scroller = e.target.closest('.jjp-content');
    if (!scroller) { e.preventDefault(); return; }

    // On wheel, prevent page scroll when content hits top/bottom
    if (e.type === 'wheel') {
      const { scrollTop, scrollHeight, clientHeight } = scroller;
      const delta = e.deltaY || 0;
      const atTop = (scrollTop <= 0) && delta < 0;
      const atBottom = (scrollTop + clientHeight >= scrollHeight - 1) && delta > 0;
      if (atTop || atBottom) e.preventDefault();
    }
  }

  // ---------- Show / Hide ----------
  function show(opts = {}) {
    lastFocused = document.activeElement;
    pendingHref = opts.targetHref ?? null;
    currentKey  = opts.key ?? keyFor(null);

    overlay.setAttribute('aria-hidden', 'false');
    if (dontShow) dontShow.checked = false;

    lockPage();

    // Focus the primary action
    requestAnimationFrame(() => btnContinue?.focus?.({ preventScroll: true }));

    document.addEventListener('keydown', trapFocus);
    // Stop scroll escaping out of the dialog on iOS/Safari/Chrome
    document.addEventListener('touchmove', blockScrollLeak, { passive: false });
    document.addEventListener('wheel', blockScrollLeak, { passive: false });
  }

  function hide() {
    overlay.setAttribute('aria-hidden', 'true');

    document.removeEventListener('keydown', trapFocus);
    document.removeEventListener('touchmove', blockScrollLeak, { passive: false });
    document.removeEventListener('wheel', blockScrollLeak, { passive: false });

    unlockPage();

    // Restore previous focus
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus({ preventScroll: true });
    }
  }

  // ---------- Public API ----------
  window.JJPreface = { show, hide };

  // ---------- Triggers ----------
  document.addEventListener('click', function (e) {
    const trigger = e.target.closest('.requires-preface');
    if (!trigger) return;

    // Allow modifier-click / new tab
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || trigger.target === '_blank') return;

    const key = keyFor(trigger);
    if (shouldSkip(key)) return; // let it navigate

    e.preventDefault();
    show({ targetHref: trigger.getAttribute('href') || null, key });
  });

  // ---------- Buttons ----------
  btnContinue?.addEventListener('click', () => {
    if (dontShow?.checked && currentKey) {
      sessionStorage.setItem(currentKey, '1');
    }
    // Tiny delay for UX polish
    setTimeout(() => {
      if (pendingHref) window.location.href = pendingHref;
      hide();
    }, 80);
  });

  btnCancel?.addEventListener('click', hide);
  btnClose?.addEventListener('click', hide);

  // (Optional) Close when tapping backdrop outside dialog (comment out to disable)
  overlay.addEventListener('click', (e) => {
    if (!dialog.contains(e.target)) hide();
  });

})();
