/* CalcVibe shared helpers — single source of truth for all calculators.
   Loaded on every page before the page-specific <script>. */
(function () {
  'use strict';

  /* ---- Number formatting (SA convention: space thousands separator) ---- */

  // Format a Rand amount, e.g. fmtR(1234.5) -> "R 1 234.50", fmtR(1234.5, 0) -> "R 1 235"
  function fmtR(n, dp) {
    dp = (dp === undefined) ? 2 : dp;
    var num = Number(n);
    if (!isFinite(num)) num = 0;
    var sign = num < 0 ? '− ' : ''; // proper minus sign
    var parts = Math.abs(num).toFixed(dp).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return sign + 'R ' + parts.join('.');
  }

  // Same as fmtR but always prefixed with a minus (for deduction rows)
  function fmtRdeduct(n, dp) { return '− ' + fmtR(Math.abs(Number(n) || 0), dp); }
  // Same as fmtR but always prefixed with a plus (for credit rows)
  function fmtRcredit(n, dp) { return '+ ' + fmtR(Math.abs(Number(n) || 0), dp); }

  // Parse a user-typed money string ("R 1 500 000", "1,500,000") into a number
  function parseVal(s) {
    return parseFloat(String(s == null ? '' : s).replace(/[^0-9.\-]/g, '')) || 0;
  }

  // Format a number for display inside an input field (grouped, no R, keeps decimals)
  function fmtVal(n) {
    var num = Number(n) || 0;
    var parts = String(num).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return parts.join('.');
  }

  /* ---- Unified money inputs ----
     Any <input class="js-money"> becomes a numeric text field that groups digits
     on blur, shows the raw number on focus, and calls the page's calculate() live. */
  function attachMoneyInputs(root) {
    root = root || document;
    var fields = root.querySelectorAll('input.js-money');
    Array.prototype.forEach.call(fields, function (el) {
      el.setAttribute('inputmode', 'numeric');
      el.setAttribute('autocomplete', 'off');
      el.addEventListener('focus', function () {
        var v = parseVal(el.value);
        el.value = v ? String(v) : '';
      });
      el.addEventListener('blur', function () {
        var raw = el.value.trim();
        el.value = raw === '' ? '' : String(parseVal(raw));
        runCalculate();
      });
      el.addEventListener('input', runCalculate);
    });
  }

  function runCalculate() {
    if (typeof window.calculate === 'function') window.calculate();
  }

  /* ---- Copy to clipboard ---- */
  function copyText(text, btn) {
    var done = function () { flashCopied(btn); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { legacyCopy(text, done); });
    } else {
      legacyCopy(text, done);
    }
  }

  function legacyCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    document.body.removeChild(ta);
  }

  function flashCopied(btn) {
    if (!btn) return;
    if (!btn.dataset.label) btn.dataset.label = btn.textContent;
    btn.classList.add('is-copied');
    btn.textContent = 'Copied ✓';
    setTimeout(function () {
      btn.classList.remove('is-copied');
      btn.textContent = btn.dataset.label;
    }, 1600);
  }

  // Copy the text of a result element, e.g. <button onclick="CalcVibe.copyResult('resNetPay', this)">
  function copyResult(targetId, btn) {
    var el = document.getElementById(targetId);
    if (el) copyText(el.textContent.replace(/\s+/g, ' ').trim(), btn);
  }

  /* ---- Shareable URL ----
     Inputs/selects marked with data-share are encoded into the query string so a
     calculated scenario can be bookmarked or shared. */
  function buildShareUrl() {
    var params = new URLSearchParams();
    var els = document.querySelectorAll('[data-share]');
    Array.prototype.forEach.call(els, function (el) {
      if (el.type === 'checkbox') {
        if (el.checked) params.set(el.id, '1');
        return;
      }
      var val = el.classList.contains('js-money') ? parseVal(el.value) : el.value;
      if (val !== '' && val != null) params.set(el.id, val);
    });
    var base = location.origin + location.pathname;
    var qs = params.toString();
    return qs ? base + '?' + qs : base;
  }

  function copyShareLink(btn) { copyText(buildShareUrl(), btn); }

  // Apply ?params from the URL back onto the inputs on load. Returns true if any applied.
  function applyShareParams() {
    var params = new URLSearchParams(location.search);
    var applied = false;
    params.forEach(function (val, key) {
      var el = document.getElementById(key);
      if (!el || !el.hasAttribute('data-share')) return;
      if (el.type === 'checkbox') {
        el.checked = (val === '1' || val === 'true');
      } else {
        el.value = el.classList.contains('js-money') ? String(parseVal(val)) : val;
      }
      // Fire the page's own handlers so sliders, tooltips, and calc stay in sync
      var evt = (el.tagName === 'SELECT' || el.type === 'checkbox') ? 'change' : 'input';
      el.dispatchEvent(new Event(evt, { bubbles: true }));
      applied = true;
    });
    return applied;
  }

  /* ---- Accordion (accessible) ---- */
  function toggleAccordion(id) {
    var a = document.getElementById(id);
    if (!a) return;
    var open = a.classList.toggle('open');
    var header = a.querySelector('.accordion-header');
    if (header) header.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  /* ---- Accessible accordions ----
     Enhances existing .accordion-header elements (which keep their inline onclick)
     with role, focusability, keyboard support and aria-expanded sync. */
  function initAccordions(root) {
    root = root || document;
    var headers = root.querySelectorAll('.accordion-header');
    Array.prototype.forEach.call(headers, function (h) {
      if (!h.hasAttribute('role')) h.setAttribute('role', 'button');
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '0');
      var open = h.closest('.accordion') && h.closest('.accordion').classList.contains('open');
      h.setAttribute('aria-expanded', open ? 'true' : 'false');
      h.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          h.click();
        }
      });
    });
  }

  /* ---- Init ---- */
  document.addEventListener('DOMContentLoaded', function () {
    attachMoneyInputs();
    initAccordions();
    if (applyShareParams()) runCalculate();
  });

  // Public API
  window.CalcVibe = {
    fmtR: fmtR,
    fmtRdeduct: fmtRdeduct,
    fmtRcredit: fmtRcredit,
    parseVal: parseVal,
    fmtVal: fmtVal,
    copyText: copyText,
    copyResult: copyResult,
    buildShareUrl: buildShareUrl,
    copyShareLink: copyShareLink,
    toggleAccordion: toggleAccordion
  };

  // Back-compat globals so existing inline handlers keep working
  window.fmtR = fmtR;
  window.parseVal = parseVal;
  window.fmtVal = fmtVal;
  window.toggleAccordion = toggleAccordion;
})();
