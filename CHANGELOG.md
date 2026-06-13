# Changelog

## 0.1.5 - 2026-06-13

- Abbreviate `Serial number` to `S/N` on the printed label while keeping the
  full wording in the settings.

## 0.1.4 - 2026-06-13

- Update fields, QR visibility, dimensions, print page size, and the shareable
  settings URL immediately without a page reload.
- Keep a no-JavaScript submit fallback.

## 0.1.3 - 2026-06-13

- Make the preview card follow the selected label width instead of filling the
  wide content column.
- Preserve full-width behavior on narrow mobile screens.

## 0.1.2 - 2026-06-13

- Reduce the preview stage height and padding without changing printed label
  dimensions.

## 0.1.1 - 2026-06-13

- Replace the large form action with a compact print icon beside the asset name.
- Keep an accessible label and tooltip on the icon.
- Reduce the printed QR footprint to leave more room for asset information.

## 0.1.0 - 2026-06-13

- Add a direct print action and label tab to common GLPI asset types.
- Add immediate label preview with 62 x 29, 50 x 25, and 70 x 37 mm presets.
- Add bounded custom label dimensions.
- Include asset name, asset number, serial number, and model by default.
- Add optional asset type, manufacturer, and location fields.
- Add an optional QR code that opens the exact GLPI asset.
- Preserve normal GLPI authentication and asset permissions.
- Add Chromium and Firefox end-to-end, QR decode, error-path, print-media,
  cleanup, and WCAG 2.1 A/AA checks.
