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

    $label = __('Print asset label', 'assetlabel');
    echo "<a class='assetlabel-header-action btn btn-sm btn-icon btn-ghost-secondary' href='" .
        htmlescape(PluginAssetlabelLabel::getPrintUrl($item)) . "' aria-label='" .
        htmlescape($label) . "' title='" . htmlescape($label) . "'>";
    echo "<i class='ti ti-printer' aria-hidden='true'></i></a>";
}
