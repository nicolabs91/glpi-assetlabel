# Asset Label for GLPI

Asset Label adds a compact print icon beside the asset name and a `Print label`
tab to GLPI computers, monitors, network equipment, peripherals, phones, and
printers.

The default label contains:

- asset name;
- asset number;
- serial number;
- model;
- a QR code that opens the exact asset in GLPI.

Asset type, manufacturer, and location can be enabled from the preview. The QR
target uses the normal GLPI asset URL, so authentication and asset permissions
continue to apply.

## Workflow

1. Open an asset.
2. Select the print icon beside the asset name.
3. Review the immediately usable preview.
4. Optionally change the label size, orientation, fields, or QR setting; the
   preview updates immediately without reloading the page.
5. Select `Print`.

Supported presets are 62 x 29 mm, 50 x 25 mm, and 70 x 37 mm. Each preset can
be used in landscape or portrait orientation. Custom sizes are limited to safe
printable ranges.

## Installation

Copy this directory to `plugins/assetlabel`, then run:

```console
php bin/console plugin:install assetlabel
php bin/console plugin:activate assetlabel
```

Asset Label creates no database tables and does not modify asset data.

## Verification

Install the browser dependencies with `npm install`, then run:

```console
npm run test:e2e
npm run test:firefox
npm run test:webkit
```

The checkpoints cover creation and cleanup of real assets, the direct form
action, the asset tab, default fields, QR generation, repeated field toggles,
all presets, custom-dimension bounds, malformed input, state after reload,
long and special text, the no-JavaScript fallback, anonymous access, print
media, browser errors, and WCAG 2.1 A/AA accessibility.
