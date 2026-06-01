# CalcVibe Development Rules

## Last Updated Date — MANDATORY
Every calculator page MUST include a "last updated" notice just above the footer.
Format: "Rates & figures last updated: [Month Year] | Based on [relevant authority]"
Style: muted text, 0.75rem, Epilogue font, colour #5a5a72
This must be updated every time a calculator's rates or formulas are changed.

## Accuracy Standard
All tax rates, transfer duties, bond fees, UIF rates, and labour law figures must reference
the current official SA source:
- Tax & transfer duty: SARS (sars.gov.za)
- Bond registration: Deeds Office tariff table
- Labour law (UIF, overtime, leave, retrenchment): Department of Labour / BCEA
- Interest rates: SARB (resbank.co.za)

## Currency Formatting
All Rand amounts must use SA thousand separator format (spaces, not commas).
Example: R 2 500 000 not R2,500,000
Use the shared `CalcVibe.fmtR(value, decimals)` helper (deterministic space
grouping) rather than `toLocaleString`, which is browser-dependent. Use 0
decimals for large projections (retirement, compound) and 2 for everyday amounts.

## Shared Assets (load on every calculator)
- `<link rel="stylesheet" href="/calcvibe.css">` just before `</head>`
- `<script src="/calcvibe.js"></script>` just before the page's own `<script>`
- calcvibe.js provides: fmtR / parseVal / fmtVal, money-input wiring (class
  `js-money`), copy-to-clipboard (`CalcVibe.copyResult`), shareable URLs
  (`data-share` attribute + `CalcVibe.copyShareLink`), and accessible accordions.
- Do NOT re-declare a local `toggleAccordion`; the shared one syncs aria-expanded.

## Design System
All calculators must use:
- Fonts: Playfair Display (headings) + Epilogue (body)
- Primary accent: #1a6b3c
- Background: #f7f6f2
- Match the style of vat-calculator.html

## Accessibility (MANDATORY)
- Skip link as the first body element: `<a href="#main" class="skip-link">…</a>` and `id="main"` on `<main>`
- Results container marked `aria-live="polite" aria-atomic="true"`
- Every input associated with its label via `for`/`id`
- Mode toggle buttons use `aria-pressed`; decorative emoji wrapped in `<span aria-hidden="true">`

## Content Standard
All explainer text on CalcVibe must be:
- Purely educational and informational
- Free of recommendations, opinions, or implied advice
- Free of references to specific commentators, studies, or third parties
- Accurate to current SA legislation
- Accompanied by a disclaimer noting that CalcVibe does not provide financial advice

## New Calculator Checklist
Before pushing any new calculator:
- [ ] Accurate formulas verified against official SA source
- [ ] Last updated date added
- [ ] Helper text or tooltip on every input field (`.input-help` text, or the `label-with-tip` "i" tooltip)
- [ ] Accessibility checklist met (skip link, aria-live results, label/for, aria-pressed, aria-hidden emoji)
- [ ] Shared calcvibe.css + calcvibe.js loaded; formatting via CalcVibe.fmtR
- [ ] Copy-result + Share-link buttons wired; inputs marked `data-share`
- [ ] Mobile responsive
- [ ] Added to index.html with correct badge
- [ ] Added to sitemap.xml
- [ ] Disclaimer at bottom: "For estimation purposes only"

## SEO Requirements for New Calculators
Every new calculator page must include:
- A unique `<title>` tag: "[Calculator Name] | CalcVibe"
- A `<meta name="description">` of ~150 characters describing what the calculator does and who it's for
- `<meta name="keywords">` including the calculator topic + "South Africa" + the relevant legislation or authority (e.g. SARS, BCEA, UIF)
- A short 2-3 sentence introductory paragraph (`<p class="calc-intro">`) inside the `.page-header` div, below the `.page-sub` line, explaining the calculator's purpose — written naturally for users, not keyword-stuffed

## Number Input Formatting
All number input fields across the site must display values with space-separated thousands
(e.g. "4 200 000" not "4200000"). The displayed value must be formatted with spaces while
the underlying value used for calculations remains a plain number. This must be consistent
across all calculators.

Reference implementation: Compound Interest Calculator (`compound-interest-calculator.html`).
Key pattern:
- Use `type="text" inputmode="numeric"` (not `type="number"`) for money/large-number inputs
- On `oninput`: call `onNumInput()` which reads the raw value, updates the slider, and triggers `calculate()`
- On `onfocus`: strip formatting — `this.value = String(parseVal(this.value) || '')`
- On `onblur`: reformat — `this.value = fmtVal(parseVal(this.value)); calculate()`
- `fmtVal(n)` formats with space thousands: `n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')`
- `parseVal(s)` strips spaces/commas before parsing: `parseFloat(String(s).replace(/[ \s,]/g, '')) || 0`
- Do NOT use `type="number"` for inputs that display formatted values — browsers strip non-numeric characters

## UI Components

### Tooltips / Info Popups
- All tooltip and info popup elements must have z-index: 9999 minimum
- Tooltips must never be clipped by overflow:hidden on parent containers
- If a tooltip is inside a container with a stacking context (transform,
  opacity, overflow:hidden), the tooltip element must be appended to
  <body> on activation via JavaScript and positioned absolutely using
  getBoundingClientRect()
- Test tooltips inside dark panels and sticky headers — these are the
  most common failure points
- This rule applies to ALL calculators, not just the one where the
  bug was found
