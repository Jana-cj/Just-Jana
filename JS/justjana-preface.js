/* ============== Just Jana — Story Preface Gate (with scroll reset) ==============

How it works:
- Add class "requires-preface" to any link or element that should trigger the gate.
- Optional: add data-preface-key="unique-key" to customize the "don't show again" per story.
  - If omitted on a link, we fall back to its href or the current page path.
- If the checkbox "Don't show again for this story" is ticked, a sessionStorage key is set,
  and the gate won't appear again for that story during this browser session.

You can also force-show on page load (e.g., on story pages) by calling:
  JJPreface.show({ targetHref: null, key: 'story-slug' });
*/

(function () {
  const overlay    = document.getElementById('jj-preface-overlay');
  const btnClose   = overlay.querySelector('.jjp-close');
  const btnContinue= document.getElementById('jjp-continue');
  const btnCancel  = document.getElementById('jjp-cancel');
  const dontShow   = document.getElementById('jjp-dontshow');

  // Common inner containers that might scroll
  function getScrollTargets() {
    return [
      overlay,
      overlay.querySelector('.jjp-content'),
      overlay.querySelector('.jjp-body'),
      overlay.querySelector('.modal-body'),
      overlay.querySelector('.jjp-dialog'),
      overlay.querySelector('[data-scrollable="true"]')
    ].filter(Boolean);
  }

  // Always open from the top
  function resetPrefaceScroll() {
    // Wait one frame so CSS classes/display changes apply first
    requestAnimationFrame(() => {
      getScrollTargets().forEach(el => {
        try {
          if (el.scrollTo) {
            // 'instant' is ignored in some browsers; still safe to pass.
            el.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          } else {
            el.scrollTop = 0;
            el.scrollLeft = 0;
          }
        } catch (_) {
          el.scrollTop = 0;
          el.scrollLeft = 0;
        }
      });
    });
  }

  let pendingHref = null;
  let currentKey  = null;
  let lastFocused = null;

  // Utilities
  const keyFor = (el) => {
    const explicit = el?.getAttribute?.('data-preface-key');
    if (explicit) return explicit;
    const href = el?.getAttribute?.('href');
    if (href && href !== '#') return `jjp:${href}`;
    return `jjp:${location.pathname}`;
  };

  const shouldSkip = (key) => sessionStorage.getItem(key) === '1';

  const trapFocus = (e) => {
    if (overlay.getAttribute('aria-hidden') === 'true') return;
    const f = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const focusables = Array.from(f).filter(el => !el.hasAttribute('disabled'));
    if (!focusables.length) return;
    const first = focusables[0];
    const last  = focusables[focusables.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    } else if (e.key === 'Escape') {
      hide();
    }
  };

  function show(opts = {}) {
    lastFocused = document.activeElement;
    pendingHref = opts.targetHref ?? null;
    currentKey  = opts.key ?? keyFor(null);

    overlay.setAttribute('aria-hidden', 'false');
    dontShow.checked = false;

    // Prevent page behind from scrolling
    document.body.style.overflow = 'hidden';

    // Ensure overlay starts at top on every open
    resetPrefaceScroll();

    // Focus the main button for accessibility
    requestAnimationFrame(() => btnContinue.focus());
    document.addEventListener('keydown', trapFocus);
  }

  function hide() {
    overlay.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', trapFocus);
    document.body.style.overflow = '';

    // Also reset on close so the *next* open is fresh even if content height changed
    resetPrefaceScroll();

    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
  }

  // Public API
  window.JJPreface = { show, hide };

  // Wire triggers
  document.addEventListener('click', function (e) {
    const trigger = e.target.closest('.requires-preface');
    if (!trigger) return;

    // allow modifier-click (open in new tab) to behave normally
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || trigger.target === '_blank') return;

    const key = keyFor(trigger);
    if (shouldSkip(key)) return; // let it navigate

    e.preventDefault();
    show({ targetHref: trigger.getAttribute('href') || null, key });
  });

  // Buttons
  btnContinue.addEventListener('click', () => {
    if (dontShow.checked && currentKey) {
      sessionStorage.setItem(currentKey, '1');
    }
    const go = () => {
      if (pendingHref) window.location.href = pendingHref;
      hide();
    };
    setTimeout(go, 80); // tiny delay for nicer feel
  });

  btnCancel.addEventListener('click', hide);
  btnClose.addEventListener('click', hide);

  // Safety: if CSS class changes are used to show/hide, also reset on "becoming visible"
  if ('MutationObserver' in window) {
    const mo = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          const isOpen =
            overlay.getAttribute('aria-hidden') === 'false' ||
            overlay.classList.contains('jjp-open') ||
            overlay.classList.contains('show') ||
            overlay.style.display === 'block';
          if (isOpen) resetPrefaceScroll();
        }
      }
    });
    mo.observe(overlay, { attributes: true });
  }
})();
