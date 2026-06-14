# Changelog

## 0.1.0 - 2026-06-14

- Add a compact print action and label tab to common GLPI asset types.
- Add immediate label preview with 62 x 29, 50 x 25, and 70 x 37 mm presets.
- Add bounded custom label dimensions.
- Include asset name, asset number, serial number, and model by default.
- Add optional asset type, manufacturer, and location fields.
- Show label values without redundant field-name prefixes.
- Add an optional QR code that opens the exact GLPI asset.
- Keep preview fields, QR visibility, dimensions, print page size, and the
  shareable settings URL synchronized without reloading.
- Fit the preview to the selected label and keep it usable on mobile screens.
- Optimize the print layout for Chromium, Firefox, and Safari/WebKit.
- Keep a no-JavaScript submit fallback.
- Preserve normal GLPI authentication and asset permissions.
- Add Chromium, Firefox, and WebKit end-to-end, QR decode, error-path,
  print-media, cleanup, and WCAG 2.1 A/AA checks.
