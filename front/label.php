<?php

include '../../../inc/includes.php';

global $CFG_GLPI;

$itemtype = (string) ($_GET['itemtype'] ?? '');
$itemsId = (int) ($_GET['items_id'] ?? 0);
if (!PluginAssetlabelLabel::supports($itemtype) || $itemsId <= 0) {
    Html::displayErrorAndDie(__('Invalid asset.', 'assetlabel'), true);
}

$item = new $itemtype();
$item->check($itemsId, READ);

$options = PluginAssetlabelLabel::normalizeOptions($_GET);
$details = PluginAssetlabelLabel::getDetails($item);
$fieldLabels = PluginAssetlabelLabel::getFieldLabels();
$assetUrl = PluginAssetlabelLabel::getAssetUrl($item);
$title = $details['name'] ?: sprintf(__('%1$s #%2$d'), $details['type'], $itemsId);
$width = rtrim(rtrim(number_format($options['width'], 2, '.', ''), '0'), '.');
$height = rtrim(rtrim(number_format($options['height'], 2, '.', ''), '0'), '.');

Html::header(__('Asset label', 'assetlabel'), $_SERVER['PHP_SELF'], 'assets');
echo '<style>';
echo ':root{--assetlabel-width:' . htmlescape($width) . 'mm;--assetlabel-height:' .
    htmlescape($height) . 'mm}';
echo '@media print{@page{size:' . htmlescape($width) . 'mm ' . htmlescape($height) .
    'mm;margin:0}}';
echo '</style>';

echo "<main class='container-fluid assetlabel-page'>";
echo "<div class='assetlabel-toolbar d-flex align-items-center gap-2 mb-3'>";
echo '<div><h1 class="h2 mb-1">' . htmlescape(__('Print asset label', 'assetlabel')) .
    '</h1><p class="text-muted mb-0">' . htmlescape($title) . '</p></div>';
echo "<button class='btn btn-primary ms-auto' type='button' onclick='window.print()'>";
echo "<i class='ti ti-printer'></i> " . htmlescape(__('Print')) . '</button>';
echo "<a class='btn btn-outline-secondary' href='" .
    htmlescape($item->getFormURLWithID($itemsId)) . "'>" . htmlescape(__('Back')) . '</a>';
echo '</div>';

echo "<div class='row g-3 assetlabel-workspace'>";
echo "<div class='col-xl-4 assetlabel-controls'><section class='card'><div class='card-body'>";
echo '<h2 class="h4">' . htmlescape(__('Label settings', 'assetlabel')) . '</h2>';
echo "<form method='get'>";
echo Html::hidden('itemtype', ['value' => $itemtype]);
echo Html::hidden('items_id', ['value' => $itemsId]);
echo Html::hidden('submitted', ['value' => 1]);
echo "<label class='form-label' for='assetlabel-format'>" .
    htmlescape(__('Label size', 'assetlabel')) . '</label>';
echo "<select class='form-select mb-3' id='assetlabel-format' name='format'>";
foreach ([
    '62x29' => '62 x 29 mm',
    '50x25' => '50 x 25 mm',
    '70x37' => '70 x 37 mm',
    'custom' => __('Custom size', 'assetlabel'),
] as $value => $label) {
    echo "<option value='" . htmlescape($value) . "'" .
        ($options['format'] === $value ? ' selected' : '') . '>' .
        htmlescape($label) . '</option>';
}
echo '</select>';
echo "<div class='row g-2 mb-3'><div class='col-6'><label class='form-label' for='assetlabel-width'>" .
    htmlescape(__('Width (mm)', 'assetlabel')) . '</label>';
echo Html::input('width', [
    'id' => 'assetlabel-width',
    'type' => 'number',
    'value' => $width,
    'min' => 20,
    'max' => 150,
    'step' => 0.5,
]);
echo "</div><div class='col-6'><label class='form-label' for='assetlabel-height'>" .
    htmlescape(__('Height (mm)', 'assetlabel')) . '</label>';
echo Html::input('height', [
    'id' => 'assetlabel-height',
    'type' => 'number',
    'value' => $height,
    'min' => 10,
    'max' => 100,
    'step' => 0.5,
]);
echo '</div></div>';

echo '<fieldset><legend class="h5">' . htmlescape(__('Information', 'assetlabel')) . '</legend>';
foreach ($fieldLabels as $field => $label) {
    echo "<label class='form-check mb-2'>";
    echo "<input class='form-check-input' type='checkbox' name='" . htmlescape($field) .
        "' value='1'" . (in_array($field, $options['fields'], true) ? ' checked' : '') . '>';
    echo "<span class='form-check-label'>" . htmlescape($label) . '</span></label>';
}
echo '</fieldset>';
echo "<label class='form-check mt-3 mb-3'>";
echo "<input class='form-check-input' type='checkbox' name='qr' value='1'" .
    ($options['qr'] ? ' checked' : '') . '>';
echo "<span class='form-check-label'>" .
    htmlescape(__('QR code to this GLPI asset', 'assetlabel')) . '</span></label>';
echo "<button class='btn btn-secondary w-100' type='submit'>" .
    htmlescape(__('Update preview', 'assetlabel')) . '</button>';
Html::closeForm();
echo '</div></section></div>';

echo "<div class='col-xl-8'><section class='card assetlabel-preview-card'><div class='card-body'>";
echo '<h2 class="h4 assetlabel-screen-only">' . htmlescape(__('Preview', 'assetlabel')) . '</h2>';
echo "<div class='assetlabel-preview-stage'><article class='assetlabel-label'>";
if ($options['qr']) {
    echo "<img class='assetlabel-qr' alt='" .
        htmlescape(__('QR code to this GLPI asset', 'assetlabel')) . "' src='" .
        htmlescape(PluginAssetlabelLabel::getQrDataUri($assetUrl)) . "'>";
}
echo "<div class='assetlabel-content'>";
$rendered = 0;
foreach ($options['fields'] as $field) {
    $value = $details[$field] ?? '';
    if ($value === '') {
        continue;
    }
    if ($field === 'name') {
        echo "<div class='assetlabel-name'>" . htmlescape($value) . '</div>';
    } else {
        echo "<div class='assetlabel-field'><span>" . htmlescape($fieldLabels[$field]) .
            '</span><strong>' . htmlescape($value) . '</strong></div>';
    }
    $rendered++;
}
if ($rendered === 0) {
    echo "<div class='assetlabel-empty'>" .
        htmlescape(__('Select at least one available field.', 'assetlabel')) . '</div>';
}
echo '</div></article></div>';
echo "<p class='small text-muted mt-3 mb-0 assetlabel-screen-only'>" .
    htmlescape(__('The QR code opens the asset in GLPI. Normal login and asset permissions still apply.', 'assetlabel')) .
    '</p>';
echo '</div></section></div></div></main>';
Html::footer();
