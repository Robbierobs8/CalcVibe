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
Use toLocaleString('en-ZA') for formatting.

## Design System
All calculators must use:
- Fonts: Playfair Display (headings) + Epilogue (body)
- Primary accent: #1a6b3c
- Background: #f7f6f2
- Match the style of vat-calculator.html

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
- [ ] Tooltips on every input field
- [ ] Mobile responsive
- [ ] Added to index.html with correct badge
- [ ] Added to sitemap.xml
- [ ] Disclaimer at bottom: "For estimation purposes only"
