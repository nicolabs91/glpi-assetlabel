<?php

function plugin_assetlabel_install(): bool
{
    return true;
}

function plugin_assetlabel_uninstall(): bool
{
    return true;
}

function plugin_assetlabel_post_item_form(array $params): void
{
    $item = $params['item'] ?? null;
    if (!$item instanceof CommonDBTM || $item->isNewItem()) {
        return;
    }
    if (!PluginAssetlabelLabel::supports($item::class) || !$item->can($item->getID(), READ)) {
        return;
    }

    echo "<div class='assetlabel-form-action'>";
    echo "<a class='btn btn-outline-primary' href='" .
        htmlescape(PluginAssetlabelLabel::getPrintUrl($item)) . "'>";
    echo "<i class='ti ti-printer'></i> " .
        htmlescape(__('Print asset label', 'assetlabel')) . '</a></div>';
}
