<?php

use Com\Tecnick\Barcode\Barcode;

final class PluginAssetlabelLabel extends CommonGLPI
{
    private const ITEMTYPES = [
        Computer::class,
        Monitor::class,
        NetworkEquipment::class,
        Peripheral::class,
        Phone::class,
        Printer::class,
    ];

    private const MODEL_FIELDS = [
        Computer::class => ['computermodels_id', ComputerModel::class],
        Monitor::class => ['monitormodels_id', MonitorModel::class],
        NetworkEquipment::class => ['networkequipmentmodels_id', NetworkEquipmentModel::class],
        Peripheral::class => ['peripheralmodels_id', PeripheralModel::class],
        Phone::class => ['phonemodels_id', PhoneModel::class],
        Printer::class => ['printermodels_id', PrinterModel::class],
    ];

    public static function getSupportedItemtypes(): array
    {
        return self::ITEMTYPES;
    }

    public static function supports(string $itemtype): bool
    {
        return in_array($itemtype, self::ITEMTYPES, true);
    }

    public static function getPrintUrl(CommonDBTM $item): string
    {
        global $CFG_GLPI;

        return $CFG_GLPI['root_doc'] . '/plugins/assetlabel/front/label.php?' .
            http_build_query([
                'itemtype' => $item::class,
                'items_id' => (int) $item->getID(),
            ]);
    }

    public static function getAssetUrl(CommonDBTM $item): string
    {
        global $CFG_GLPI;

        return rtrim((string) $CFG_GLPI['url_base'], '/') .
            $item->getFormURLWithID((int) $item->getID());
    }

    public static function getQrDataUri(string $value): string
    {
        $barcode = new Barcode();
        $qr = $barcode->getBarcodeObj(
            'QRCODE,H',
            $value,
            220,
            220,
            'black',
            [4, 4, 4, 4]
        )->setBackgroundColor('white');

        return 'data:image/png;base64,' . base64_encode($qr->getPngData());
    }

    public static function getDetails(CommonDBTM $item): array
    {
        $model = '';
        [$modelField, $modelClass] = self::MODEL_FIELDS[$item::class];
        $modelId = (int) ($item->fields[$modelField] ?? 0);
        if ($modelId > 0) {
            $model = Dropdown::getDropdownName($modelClass::getTable(), $modelId);
        }

        $manufacturer = '';
        $manufacturerId = (int) ($item->fields['manufacturers_id'] ?? 0);
        if ($manufacturerId > 0) {
            $manufacturer = Dropdown::getDropdownName(Manufacturer::getTable(), $manufacturerId);
        }

        $location = '';
        $locationId = (int) ($item->fields['locations_id'] ?? 0);
        if ($locationId > 0) {
            $location = Dropdown::getDropdownName(Location::getTable(), $locationId);
        }

        return [
            'name' => trim((string) ($item->fields['name'] ?? '')),
            'asset_number' => trim((string) ($item->fields['otherserial'] ?? '')),
            'serial' => trim((string) ($item->fields['serial'] ?? '')),
            'model' => trim($model),
            'type' => $item::getTypeName(1),
            'manufacturer' => trim($manufacturer),
            'location' => trim($location),
        ];
    }

    public static function normalizeOptions(array $input): array
    {
        $formats = [
            '62x29' => [62.0, 29.0],
            '50x25' => [50.0, 25.0],
            '70x37' => [70.0, 37.0],
        ];
        $formatInput = $input['format'] ?? '62x29';
        $format = is_string($formatInput) ? $formatInput : 'custom';
        if (isset($formats[$format])) {
            [$width, $height] = $formats[$format];
        } else {
            $format = 'custom';
            $width = self::clampDimension($input['width'] ?? 62, 20, 150);
            $height = self::clampDimension($input['height'] ?? 29, 10, 100);
        }

        $fields = [];
        foreach (array_keys(self::getFieldLabels()) as $field) {
            if (array_key_exists($field, $input)) {
                $fields[] = $field;
            }
        }
        if (!isset($input['submitted'])) {
            $fields = ['name', 'asset_number', 'serial', 'model'];
        }

        return [
            'format' => $format,
            'width' => $width,
            'height' => $height,
            'rotation' => self::normalizeRotation($input['rotation'] ?? 90),
            'fields' => $fields,
            'qr' => !isset($input['submitted']) || isset($input['qr']),
        ];
    }

    public static function getFieldLabels(): array
    {
        return [
            'name' => __('Asset name', 'assetlabel'),
            'asset_number' => __('Asset number', 'assetlabel'),
            'serial' => __('Serial number', 'assetlabel'),
            'model' => __('Model', 'assetlabel'),
            'type' => __('Asset type', 'assetlabel'),
            'manufacturer' => __('Manufacturer', 'assetlabel'),
            'location' => __('Location', 'assetlabel'),
        ];
    }

    private static function clampDimension(mixed $value, float $min, float $max): float
    {
        $number = is_numeric($value) ? (float) $value : $min;
        return max($min, min($max, $number));
    }

    private static function normalizeRotation(mixed $value): int
    {
        $rotation = is_numeric($value) ? (int) $value : 90;
        return in_array($rotation, [0, 90, 180, 270], true) ? $rotation : 90;
    }

    public function getTabNameForItem(CommonGLPI $item, $withtemplate = 0): string
    {
        if (!$item instanceof CommonDBTM || !self::supports($item::class)) {
            return '';
        }
        return self::createTabEntry(__('Print label', 'assetlabel'));
    }

    public static function displayTabContentForItem(
        CommonGLPI $item,
        $tabnum = 1,
        $withtemplate = 0
    ): bool {
        if (!$item instanceof CommonDBTM || !self::supports($item::class)) {
            return false;
        }

        $details = self::getDetails($item);
        echo "<div class='assetlabel-tab card'><div class='card-body'>";
        echo '<h2 class="h3">' . htmlescape(__('Asset label', 'assetlabel')) . '</h2>';
        echo '<p class="text-muted">' .
            htmlescape(__('Create a printable label with an optional QR code to this asset.', 'assetlabel')) .
            '</p>';
        echo "<div class='assetlabel-tab-summary'>";
        echo '<strong>' . htmlescape($details['name'] ?: __('Unnamed asset', 'assetlabel')) . '</strong>';
        foreach (['asset_number', 'serial', 'model'] as $field) {
            if ($details[$field] !== '') {
                echo '<span>' . htmlescape(self::getFieldLabels()[$field]) . ': ' .
                    htmlescape($details[$field]) . '</span>';
            }
        }
        echo '</div>';
        echo "<a class='btn btn-primary mt-3' href='" .
            htmlescape(self::getPrintUrl($item)) . "'>";
        echo "<i class='ti ti-printer'></i> " .
            htmlescape(__('Open label preview', 'assetlabel')) . '</a>';
        echo '</div></div>';
        return true;
    }
}
